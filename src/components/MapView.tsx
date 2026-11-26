import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FamilyProfile, FoodBatchItem, Store, Volunteer, VolunteerRoute } from '../types';

interface MapViewProps {
  stores: Store[];
  items: FoodBatchItem[];
  families: FamilyProfile[];
  volunteers: Volunteer[];
  routes: VolunteerRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

const ROUTE_COLORS = ['#5FAF2D', '#2563EB', '#EA580C', '#7C3AED'];

export function MapView({
  stores,
  items,
  families,
  volunteers,
  routes,
  selectedRouteId,
  onSelectRoute,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [55.7605, 37.624],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    layerGroup.current = L.layerGroup().addTo(map);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      layerGroup.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerGroup.current;
    if (!group) return;
    group.clearLayers();

    // 1. Рисуем маршруты
    routes.forEach((route, idx) => {
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const isSelected = !selectedRouteId || selectedRouteId === route.id;
      const latlngs: L.LatLngExpression[] = route.stops.map((s) => [s.coords.lat, s.coords.lon]);

      const polyline = L.polyline(latlngs, {
        color,
        weight: isSelected ? 4.5 : 2,
        opacity: isSelected ? 0.9 : 0.25,
        dashArray: route.completed ? undefined : '8 6',
      });

      polyline.on('click', () => onSelectRoute(route.id));
      polyline.bindTooltip(
        `<b>${route.volunteer.name}</b> → ${route.store.name}<br/>${route.totalWeightKg} кг · ${route.totalDurationMinutes} мин (−${route.savedMinutes} мин)`,
        { sticky: true }
      );
      polyline.addTo(group);
    });

    // 2. Рисуем магазины
    stores.forEach((store) => {
      const storeItems = items.filter((i) => i.storeId === store.id && !i.rejectedReason);
      const minTtl =
        storeItems.length > 0 ? Math.min(...storeItems.map((i) => i.ttlHours)) : 99;
      const totalKg = Number(
        storeItems.reduce((s, i) => s + i.quantity * i.weightKgPerUnit, 0).toFixed(1)
      );

      const bg =
        minTtl < 4 ? '#E31E24' : minTtl < 10 ? '#F59E0B' : '#5FAF2D';

      const icon = L.divIcon({
        className: 'custom-store-marker',
        html: `<div style="background:${bg};color:white;border:2.5px solid white;border-radius:10px;padding:3px 7px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.22);transform:translate(-50%,-50%);">
          🏪 ${store.name.split(' ')[0]} · ${totalKg}кг
        </div>`,
        iconSize: [0, 0],
      });

      L.marker([store.coords.lat, store.coords.lon], { icon })
        .bindPopup(
          `<div style="min-width:180px">
            <div style="font-weight:700;font-size:13px">${store.name}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:6px">${store.address}</div>
            <div style="font-size:12px">Партия: <b>${totalKg} кг</b> (${storeItems.length} поз.)</div>
            <div style="font-size:12px">Мин. срок: <b style="color:${bg}">${minTtl < 99 ? `${minTtl} ч` : 'нет партий'}</b></div>
          </div>`
        )
        .addTo(group);
    });

    // 3. Рисуем семьи-получатели
    families.forEach((fam) => {
      const icon = L.divIcon({
        className: 'custom-family-marker',
        html: `<div style="background:#ffffff;color:#1e293b;border:2px solid #2563EB;border-radius:999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.18);transform:translate(-50%,-50%);">
          🏠
        </div>`,
        iconSize: [0, 0],
      });

      L.marker([fam.coords.lat, fam.coords.lon], { icon })
        .bindPopup(
          `<div style="min-width:190px">
            <div style="font-weight:700;font-size:13px">${fam.label}</div>
            <div style="color:#64748b;font-size:11px">${fam.district} · ${fam.membersCount} чел.</div>
            <div style="font-size:12px;margin-top:4px">Без помощи: <b>${fam.daysSinceLastHelp} дн.</b></div>
            <div style="font-size:11px;color:#b45309;margin-top:2px">${fam.restrictionNotes}</div>
          </div>`
        )
        .addTo(group);
    });

    // 4. Рисуем волонтёров
    volunteers.forEach((vol) => {
      const emoji = vol.transport === 'car' ? '🚗' : vol.transport === 'bike' ? '🚲' : '🚶';
      const icon = L.divIcon({
        className: 'custom-vol-marker',
        html: `<div style="background:#1A3A1A;color:white;border:2px solid #7ED321;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.25);transform:translate(-50%,-50%);">
          ${emoji}
        </div>`,
        iconSize: [0, 0],
      });

      L.marker([vol.coords.lat, vol.coords.lon], { icon })
        .bindPopup(
          `<div>
            <div style="font-weight:700;font-size:13px">${vol.name} (${emoji})</div>
            <div style="font-size:12px">Вместимость: <b>${vol.maxCapacityKg} кг</b></div>
            <div style="font-size:12px;color:#5FAF2D">X5 Клуб: <b>${vol.x5ClubPoints} б.</b></div>
          </div>`
        )
        .addTo(group);
    });
  }, [stores, items, families, volunteers, routes, selectedRouteId, onSelectRoute]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div ref={mapRef} className="h-full w-full min-h-[430px]" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E31E24]" /> TTL &lt; 4ч
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 4–10ч
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="h-2.5 w-2.5 rounded-full bg-[#5FAF2D]" /> &gt; 10ч
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-700">🏠 Семья</span>
        <span className="text-slate-700">🚗/🚲/🚶 Волонтёр</span>
      </div>
    </div>
  );
}
