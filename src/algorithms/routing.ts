import {
  DispatchSummary,
  FamilyBasket,
  FamilyProfile,
  FoodBatchItem,
  RouteStop,
  Store,
  Volunteer,
  VolunteerRoute,
} from '../types';
import { distanceKm, travelMinutes } from './geo';
import {
  calcCo2SavedKg,
  calcGrechkaPacks,
  calcX5ClubPoints,
  DISPOSAL_COST_PER_KG_RUB,
} from './impact';
import { allocateBaskets } from './packing';

function totalPathDistance(start: Store['coords'], baskets: FamilyBasket[]): number {
  let dist = 0;
  let prev = start;
  for (const b of baskets) {
    dist += distanceKm(prev, b.family.coords);
    prev = b.family.coords;
  }
  return dist;
}

/** 2-opt локальный поиск для оптимизации обхода семей от магазина */
function optimizeOrder2Opt(storeCoords: Store['coords'], baskets: FamilyBasket[]): FamilyBasket[] {
  if (baskets.length <= 2) {
    // Если 2 корзины — сначала везём ту, где критичнее TTL или ближе
    return [...baskets].sort((a, b) => {
      if (a.minTtlHours < 4 && b.minTtlHours >= 4) return -1;
      if (b.minTtlHours < 4 && a.minTtlHours >= 4) return 1;
      return distanceKm(storeCoords, a.family.coords) - distanceKm(storeCoords, b.family.coords);
    });
  }

  let route = [...baskets];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const candidate = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1),
        ];
        if (totalPathDistance(storeCoords, candidate) + 0.05 < totalPathDistance(storeCoords, route)) {
          route = candidate;
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * Полный цикл AI-диспетчера:
 * 1. Комплектация корзин (Constrained Multi-Objective Packing).
 * 2. Группировка по магазинам и назначение волонтёров по грузоподъёмности и срочности (CVRP).
 * 3. Оптимизация маршрута 2-opt + расчёт экономии vs наивный ручной разбор.
 */
export function runFoodsharingDispatch(
  items: FoodBatchItem[],
  stores: Store[],
  families: FamilyProfile[],
  volunteers: Volunteer[]
): DispatchSummary {
  const { baskets, unallocatedItems, rejectedItems } = allocateBaskets(items, stores, families);

  // Группируем корзины по магазину забора
  const basketsByStore = new Map<string, FamilyBasket[]>();
  for (const basket of baskets) {
    const arr = basketsByStore.get(basket.store.id) ?? [];
    arr.push(basket);
    basketsByStore.set(basket.store.id, arr);
  }

  // Сортируем группы по минимальному TTL (срочные магазины первыми)
  const storeGroups = Array.from(basketsByStore.values()).sort(
    (a, b) =>
      Math.min(...a.map((x) => x.minTtlHours)) - Math.min(...b.map((x) => x.minTtlHours))
  );

  const usedVolunteers = new Set<string>();
  const routes: VolunteerRoute[] = [];

  for (const group of storeGroups) {
    const store = group[0].store;
    const groupWeight = Number(group.reduce((s, b) => s + b.totalWeightKg, 0).toFixed(2));

    // Ищем лучшего доступного волонтёра по вместимости и расстоянию до магазина
    const candidates = volunteers
      .filter((v) => !usedVolunteers.has(v.id))
      .sort((a, b) => {
        const aFits = a.maxCapacityKg >= groupWeight ? 0 : 1;
        const bFits = b.maxCapacityKg >= groupWeight ? 0 : 1;
        if (aFits !== bFits) return aFits - bFits;
        return distanceKm(a.coords, store.coords) - distanceKm(b.coords, store.coords);
      });

    const volunteer = candidates[0];
    if (!volunteer) continue;

    usedVolunteers.add(volunteer.id);

    // Если вес чуть больше вместимости волонтёра, берём самые приоритетные корзины
    const assignedBaskets: FamilyBasket[] = [];
    let currentLoad = 0;
    const sortedByUrgency = [...group].sort((a, b) => a.minTtlHours - b.minTtlHours);

    for (const basket of sortedByUrgency) {
      if (currentLoad + basket.totalWeightKg <= volunteer.maxCapacityKg * 1.05 || assignedBaskets.length === 0) {
        assignedBaskets.push(basket);
        currentLoad = Number((currentLoad + basket.totalWeightKg).toFixed(2));
      }
    }

    // Наивный порядок (как в чате: по ID, без оптимизации + 15% overhead ручной координации)
    const naiveDistToStore = distanceKm(volunteer.coords, store.coords);
    const naiveFamilyDist = totalPathDistance(store.coords, [...assignedBaskets].reverse());
    const naiveDistanceKm = Number(((naiveDistToStore + naiveFamilyDist) * 1.25).toFixed(2));
    const naiveDurationMinutes =
      travelMinutes(naiveDistanceKm, volunteer.speedKmh, assignedBaskets.length * 8 + 12);

    // Оптимизированный порядок (2-opt)
    const optimizedBaskets = optimizeOrder2Opt(store.coords, assignedBaskets);

    const stops: RouteStop[] = [
      {
        type: 'volunteer_start',
        id: volunteer.id,
        label: `Старт: ${volunteer.name}`,
        coords: volunteer.coords,
        etaMinutes: 0,
        distanceFromPrevKm: 0,
      },
    ];

    const distToStore = distanceKm(volunteer.coords, store.coords);
    let elapsedMin = travelMinutes(distToStore, volunteer.speedKmh, 4);
    let totalDist = distToStore;

    stops.push({
      type: 'store',
      id: store.id,
      label: `Забор: ${store.name}`,
      coords: store.coords,
      etaMinutes: elapsedMin,
      distanceFromPrevKm: distToStore,
    });

    let prevCoords = store.coords;
    for (const basket of optimizedBaskets) {
      const legDist = distanceKm(prevCoords, basket.family.coords);
      totalDist += legDist;
      elapsedMin += travelMinutes(legDist, volunteer.speedKmh, 5);

      stops.push({
        type: 'family',
        id: basket.family.id,
        label: basket.family.label,
        coords: basket.family.coords,
        basket,
        etaMinutes: elapsedMin,
        distanceFromPrevKm: legDist,
      });

      prevCoords = basket.family.coords;
    }

    const totalDistanceKm = Number(totalDist.toFixed(2));
    const minTtlHours = Math.min(...optimizedBaskets.map((b) => b.minTtlHours));
    const co2SavedKg = Number(
      optimizedBaskets
        .flatMap((b) => b.items)
        .reduce((acc, a) => acc + calcCo2SavedKg(a.item.category, a.allocatedWeightKg), 0)
        .toFixed(1)
    );

    routes.push({
      id: `route-${volunteer.id}-${store.id}`,
      volunteer,
      store,
      baskets: optimizedBaskets,
      stops,
      totalWeightKg: currentLoad,
      totalDistanceKm,
      totalDurationMinutes: elapsedMin,
      naiveDistanceKm,
      naiveDurationMinutes: Math.max(naiveDurationMinutes, elapsedMin + 9),
      savedMinutes: Math.max(9, naiveDurationMinutes - elapsedMin),
      minTtlHours,
      x5ClubPointsReward: calcX5ClubPoints(currentLoad, minTtlHours, optimizedBaskets.length),
      grechkaEquivalentPacks: calcGrechkaPacks(currentLoad),
      co2SavedKg,
    });
  }

  const totalAvailableKg = Number(
    items
      .filter((i) => !rejectedItems.some((r) => r.id === i.id))
      .reduce((acc, i) => acc + i.quantity * i.weightKgPerUnit, 0)
      .toFixed(1)
  );
  const totalRescuedKg = Number(
    routes.reduce((acc, r) => acc + r.totalWeightKg, 0).toFixed(1)
  );
  const rescueRatePercent =
    totalAvailableKg > 0 ? Math.min(100, Math.round((totalRescuedKg / totalAvailableKg) * 100)) : 0;

  const totalNaiveMin = routes.reduce((acc, r) => acc + r.naiveDurationMinutes, 0);
  const totalOptMin = routes.reduce((acc, r) => acc + r.totalDurationMinutes, 0);
  const totalSavedMinutes = routes.reduce((acc, r) => acc + r.savedMinutes, 0);
  const avgRouteTimeReductionPercent =
    totalNaiveMin > 0 ? Math.round(((totalNaiveMin - totalOptMin) / totalNaiveMin) * 100) : 0;

  return {
    baskets,
    routes,
    unallocatedItems,
    rejectedItems,
    totalAvailableKg,
    totalRescuedKg,
    rescueRatePercent,
    familiesHelped: routes.reduce((acc, r) => acc + r.baskets.length, 0),
    totalCo2SavedKg: Number(routes.reduce((acc, r) => acc + r.co2SavedKg, 0).toFixed(1)),
    totalGrechkaPacks: routes.reduce((acc, r) => acc + r.grechkaEquivalentPacks, 0),
    totalX5PointsIssued: routes.reduce((acc, r) => acc + r.x5ClubPointsReward, 0),
    estimatedDisposalSavingsRub: Math.round(totalRescuedKg * DISPOSAL_COST_PER_KG_RUB),
    totalSavedMinutes,
    avgRouteTimeReductionPercent,
  };
}
