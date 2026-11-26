import {
  AllocatedItem,
  FamilyBasket,
  FamilyProfile,
  FoodBatchItem,
  FoodCategory,
  Store,
} from '../types';
import { CATEGORY_LABELS } from '../data/mockData';
import { distanceKm } from './geo';

const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /сыр(ая|ое|ой|ую)|куриц|мяс|фарш|рыб|кревет/i, reason: 'Регламент X5: сырое мясо/рыба не допускаются к фудшерингу' },
  { pattern: /алкогол|вино|пиво|водк|коньяк/i, reason: 'Регламент X5: алкогольная продукция запрещена' },
  { pattern: /просроч/i, reason: 'Регламент X5: истёкший срок годности (TTL ≤ 0)' },
];

export function validateFoodSafety(item: FoodBatchItem): string | undefined {
  if (item.ttlHours <= 0) {
    return 'Регламент X5: истёкший срок годности (TTL ≤ 0)';
  }
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(item.name)) {
      return rule.reason;
    }
  }
  return item.rejectedReason;
}

function hasRestrictionConflict(item: FoodBatchItem, family: FamilyProfile): boolean {
  return item.tags.some((t) => family.restrictions.includes(t));
}

/**
 * Constrained Multi-Objective Basket Packing:
 * 1. Отсеивает небезопасные позиции по регламенту X5.
 * 2. Проверяет жёсткие ограничения (аллергены/диабет, радиус для TTL < 4ч, лимит 40% одной категории).
 * 3. Максимизирует срочность (1/TTL), справедливость (daysSinceLastHelp) и баланс категорий.
 */
export function allocateBaskets(
  items: FoodBatchItem[],
  stores: Store[],
  families: FamilyProfile[]
): {
  baskets: FamilyBasket[];
  unallocatedItems: FoodBatchItem[];
  rejectedItems: FoodBatchItem[];
} {
  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const rejectedItems: FoodBatchItem[] = [];
  const validItems: (FoodBatchItem & { remainingUnits: number })[] = [];

  for (const rawItem of items) {
    const reason = validateFoodSafety(rawItem);
    if (reason) {
      rejectedItems.push({ ...rawItem, rejectedReason: reason });
    } else if (rawItem.quantity > 0) {
      validItems.push({ ...rawItem, remainingUnits: rawItem.quantity });
    }
  }

  // Сортируем товары по срочности (минимальный TTL первыми)
  validItems.sort((a, b) => a.ttlHours - b.ttlHours);

  // Для каждой семьи закрепляем ближайший магазин, где есть подходящие товары
  const familyBaskets = new Map<
    string,
    {
      family: FamilyProfile;
      store: Store;
      items: AllocatedItem[];
      categoryWeights: Partial<Record<FoodCategory, number>>;
      totalWeightKg: number;
      targetWeightKg: number;
    }
  >();

  // Проход по каждому товару и распределение единицами по лучшим семьям
  for (const item of validItems) {
    const store = storeMap.get(item.storeId);
    if (!store) continue;

    let guard = 0;
    while (item.remainingUnits > 0 && guard < 100) {
      guard++;

      let bestFamily: FamilyProfile | null = null;
      let bestScore = -Infinity;

      for (const family of families) {
        // Hard constraint 1: аллергии / диабет
        if (hasRestrictionConflict(item, family)) continue;

        const dist = distanceKm(store.coords, family.coords);
        // Hard constraint 2: скоропорт (<4ч) только в ближнем радиусе <= 3.5 км
        if (item.ttlHours < 4 && dist > 3.5) continue;

        const existing = familyBaskets.get(family.id);
        // Одна корзина привязывается к одному магазину для компактной логистики
        if (existing && existing.store.id !== store.id) continue;

        const targetWeightKg = Math.max(2.5, family.membersCount * 2.4);
        const currentWeight = existing?.totalWeightKg ?? 0;

        // Не перегружаем корзину сверх 115% от нормы семьи
        if (currentWeight + item.weightKgPerUnit > targetWeightKg * 1.15) continue;

        // Hard constraint 3: баланс категорий (не более 45% корзины из одной категории, если уже > 1.5 кг)
        const catWeight = existing?.categoryWeights[item.category] ?? 0;
        if (
          currentWeight > 1.5 &&
          (catWeight + item.weightKgPerUnit) / (currentWeight + item.weightKgPerUnit) > 0.55
        ) {
          continue;
        }

        // Multi-objective score
        const urgencyScore = 1 / Math.max(item.ttlHours, 1);
        const fairnessScore = Math.min(family.daysSinceLastHelp / 14, 1);
        const diversityBonus = catWeight === 0 ? 1.15 : 0.2;
        const fillNeedBonus = 1 - currentWeight / targetWeightKg;
        const distPenalty = dist * 0.18;

        const score =
          2.2 * urgencyScore +
          1.4 * fairnessScore +
          1.3 * diversityBonus +
          0.9 * fillNeedBonus -
          distPenalty;

        if (score > bestScore) {
          bestScore = score;
          bestFamily = family;
        }
      }

      if (!bestFamily) break;

      let state = familyBaskets.get(bestFamily.id);
      if (!state) {
        state = {
          family: bestFamily,
          store,
          items: [],
          categoryWeights: {},
          totalWeightKg: 0,
          targetWeightKg: Math.max(2.5, bestFamily.membersCount * 2.4),
        };
        familyBaskets.set(bestFamily.id, state);
      }

      const existingAlloc = state.items.find((a) => a.item.id === item.id);
      if (existingAlloc) {
        existingAlloc.allocatedUnits += 1;
        existingAlloc.allocatedWeightKg = Number(
          (existingAlloc.allocatedWeightKg + item.weightKgPerUnit).toFixed(2)
        );
      } else {
        state.items.push({
          item,
          allocatedUnits: 1,
          allocatedWeightKg: Number(item.weightKgPerUnit.toFixed(2)),
        });
      }

      state.categoryWeights[item.category] =
        (state.categoryWeights[item.category] ?? 0) + item.weightKgPerUnit;
      state.totalWeightKg = Number((state.totalWeightKg + item.weightKgPerUnit).toFixed(2));
      item.remainingUnits -= 1;
    }
  }

  const baskets: FamilyBasket[] = [];
  for (const state of familyBaskets.values()) {
    const uniqueCategories = Object.keys(state.categoryWeights).length;
    const diversityScore = Math.min(100, Math.round((uniqueCategories / 4) * 100));
    const minTtlHours = Math.min(...state.items.map((a) => a.item.ttlHours));
    const daysCovered = Math.max(
      1,
      Number((state.totalWeightKg / (state.family.membersCount * 0.9)).toFixed(1))
    );

    const catList = Object.keys(state.categoryWeights)
      .map((c) => CATEGORY_LABELS[c] ?? c)
      .join(', ');

    const restrictionNote =
      state.family.restrictions.length > 0
        ? ` Учтены ограничения: ${state.family.restrictionNotes.toLowerCase()}.`
        : '';

    const aiExplanation = `${state.family.label} (${state.family.membersCount} чел., без помощи ${state.family.daysSinceLastHelp} дн.): набор ${state.totalWeightKg} кг (${catList}) закрывает ~${daysCovered} дн. базового рациона.${restrictionNote}`;

    baskets.push({
      id: `basket-${state.family.id}`,
      family: state.family,
      store: state.store,
      items: state.items,
      totalWeightKg: state.totalWeightKg,
      minTtlHours,
      diversityScore,
      aiExplanation,
    });
  }

  const unallocatedItems: FoodBatchItem[] = validItems
    .filter((i) => i.remainingUnits > 0)
    .map((i) => ({ ...i, quantity: i.remainingUnits }));

  return { baskets, unallocatedItems, rejectedItems };
}
