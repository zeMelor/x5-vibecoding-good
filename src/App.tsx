import { useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  HeartHandshake,
  Map as MapIcon,
  RefreshCw,
  Sparkles,
  Store as StoreIcon,
  Truck,
} from 'lucide-react';
import {
  INITIAL_BATCH_ITEMS,
  INITIAL_FAMILIES,
  INITIAL_STORES,
  INITIAL_VOLUNTEERS,
  TRANSPORT_LABELS,
} from './data/mockData';
import { FoodBatchItem } from './types';
import { runFoodsharingDispatch } from './algorithms/routing';
import { MapView } from './components/MapView';
import { StorePanel } from './components/StorePanel';
import { VolunteerPanel } from './components/VolunteerPanel';
import { ImpactDashboard } from './components/ImpactDashboard';

type Tab = 'dispatcher' | 'store' | 'volunteer' | 'analytics';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dispatcher');
  const [items, setItems] = useState<FoodBatchItem[]>(INITIAL_BATCH_ITEMS);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [completedRouteIds, setCompletedRouteIds] = useState<Set<string>>(new Set());
  const [dispatchPulse, setDispatchPulse] = useState(false);

  const summary = useMemo(
    () =>
      runFoodsharingDispatch(
        items,
        INITIAL_STORES,
        INITIAL_FAMILIES,
        INITIAL_VOLUNTEERS
      ),
    [items]
  );

  const handleAddItems = (newItems: FoodBatchItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
    setSelectedRouteId(null);
    setActiveTab('dispatcher');
    setDispatchPulse(true);
    setTimeout(() => setDispatchPulse(false), 900);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCompleteRoute = (routeId: string) => {
    setCompletedRouteIds((prev) => new Set(prev).add(routeId));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Верхняя панель */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-x5-green text-white shadow-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Выручаем<span className="text-x5-green">.AI</span>
                </h1>
                <span className="rounded-full bg-x5-mint px-2.5 py-0.5 text-[11px] font-bold text-x5-dark">
                  X5 Tech × X5 Клуб × Выручаем
                </span>
              </div>
              <p className="text-xs text-slate-500">
                AI-диспетчер фудшеринга: умная комплектация корзин и маршрутизация волонтёров
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1">
            {[
              { id: 'dispatcher', label: 'AI-Диспетчер', icon: MapIcon },
              { id: 'store', label: 'Магазин', icon: StoreIcon },
              { id: 'volunteer', label: 'Волонтёр + X5 Клуб', icon: Truck },
              { id: 'analytics', label: 'Фонд / KPI', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isActive
                      ? 'bg-white text-x5-dark shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-x5-green' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Основной контент */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'dispatcher' && (
          <div className="space-y-5">
            {/* Полоса быстрых метрик */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex flex-wrap items-center gap-5 text-sm">
                <div>
                  <span className="text-xs text-slate-500">Спасено еды</span>
                  <div className="font-extrabold text-slate-900">
                    {summary.totalRescuedKg} кг{' '}
                    <span className="text-xs font-bold text-x5-green">
                      ({summary.rescueRatePercent}%)
                    </span>
                  </div>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500">Накормлено семей</span>
                  <div className="font-extrabold text-slate-900">{summary.familiesHelped}</div>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500">Экономия времени (2-opt)</span>
                  <div className="font-extrabold text-emerald-700">
                    −{summary.totalSavedMinutes} мин (−{summary.avgRouteTimeReductionPercent}%)
                  </div>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500">Эквивалент «гречки»</span>
                  <div className="font-extrabold text-amber-700">
                    🌾 {summary.totalGrechkaPacks} пачек
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRouteId(null);
                  setDispatchPulse(true);
                  setTimeout(() => setDispatchPulse(false), 700);
                }}
                className={`flex items-center gap-2 rounded-xl bg-x5-green px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700 ${
                  dispatchPulse ? 'scale-95 ring-4 ring-x5-lime/40' : ''
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${dispatchPulse ? 'animate-spin' : ''}`} />
                Пересчитать AI-маршруты
              </button>
            </div>

            {/* Карта + Панель маршрутов и объяснений AI */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="h-[540px] lg:col-span-7">
                <MapView
                  stores={INITIAL_STORES}
                  items={items}
                  families={INITIAL_FAMILIES}
                  volunteers={INITIAL_VOLUNTEERS}
                  routes={summary.routes.map((r) => ({
                    ...r,
                    completed: completedRouteIds.has(r.id),
                  }))}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={(id) =>
                    setSelectedRouteId((prev) => (prev === id ? null : id))
                  }
                />
              </div>

              <div className="flex h-[540px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-x5-green" />
                    Сформированные рейсы ({summary.routes.length})
                  </h2>
                  {selectedRouteId && (
                    <button
                      type="button"
                      onClick={() => setSelectedRouteId(null)}
                      className="text-xs font-semibold text-x5-green hover:underline"
                    >
                      Показать все
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {summary.routes.map((route) => {
                    const isSelected = selectedRouteId === route.id;
                    return (
                      <div
                        key={route.id}
                        onClick={() =>
                          setSelectedRouteId((prev) => (prev === route.id ? null : route.id))
                        }
                        className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                          isSelected
                            ? 'border-x5-green bg-x5-mint/50 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-slate-900 text-sm">
                            {route.volunteer.name}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              ({TRANSPORT_LABELS[route.volunteer.transport]})
                            </span>
                          </div>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              route.minTtlHours < 4
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            TTL {route.minTtlHours}ч
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          <b>{route.store.name}</b> → {route.baskets.length} семьи ·{' '}
                          <b>{route.totalWeightKg} кг</b> · {route.totalDurationMinutes} мин (
                          <span className="font-semibold text-emerald-700">
                            −{route.savedMinutes} мин
                          </span>
                          )
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                          {route.baskets.map((basket) => (
                            <div
                              key={basket.id}
                              className="rounded-xl bg-white p-2.5 text-[11px] leading-relaxed text-slate-600 shadow-sm"
                            >
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{basket.family.label}</span>
                                <span className="text-x5-green">
                                  Баланс {basket.diversityScore}%
                                </span>
                              </div>
                              <p className="mt-0.5">{basket.aiExplanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'store' && (
          <StorePanel
            stores={INITIAL_STORES}
            items={items}
            onAddItems={handleAddItems}
            onRemoveItem={handleRemoveItem}
          />
        )}

        {activeTab === 'volunteer' && (
          <VolunteerPanel
            routes={summary.routes}
            completedRouteIds={completedRouteIds}
            onCompleteRoute={handleCompleteRoute}
          />
        )}

        {activeTab === 'analytics' && <ImpactDashboard summary={summary} />}
      </main>
    </div>
  );
}
