import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Receipt,
  Sparkles,
  Truck,
} from 'lucide-react';
import { VolunteerRoute } from '../types';
import { TRANSPORT_LABELS } from '../data/mockData';

interface VolunteerPanelProps {
  routes: VolunteerRoute[];
  completedRouteIds: Set<string>;
  onCompleteRoute: (routeId: string) => void;
}

export function VolunteerPanel({
  routes,
  completedRouteIds,
  onCompleteRoute,
}: VolunteerPanelProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  const route = routes[activeIdx] ?? routes[0];

  if (!route) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        Сначала запустите AI-распределение во вкладке «AI-Диспетчер», чтобы сформировать рейсы.
      </div>
    );
  }

  const isCompleted = completedRouteIds.has(route.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Список волонтёров */}
      <div className="space-y-3 lg:col-span-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Активные рейсы ({routes.length})
        </h2>
        {routes.map((r, i) => {
          const done = completedRouteIds.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setActiveIdx(i);
                setShowReceipt(false);
              }}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                i === activeIdx
                  ? 'border-x5-green bg-x5-mint/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">{r.volunteer.name}</div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    done
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {done ? 'Выполнен ✓' : `${r.totalDurationMinutes} мин`}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {TRANSPORT_LABELS[r.volunteer.transport]} · {r.store.name} → {r.baskets.length}{' '}
                семьи
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">{r.totalWeightKg} кг еды</span>
                <span className="text-x5-green">+{r.x5ClubPointsReward} б. X5 Клуба</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Мобильная карточка рейса + Чек добра */}
      <div className="lg:col-span-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          {/* Шапка профиля волонтёра */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-x5-dark text-xl text-white">
                {route.volunteer.transport === 'car'
                  ? '🚗'
                  : route.volunteer.transport === 'bike'
                    ? '🚲'
                    : '🚶'}
              </div>
              <div>
                <div className="font-bold text-slate-900">{route.volunteer.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Award className="h-3.5 w-3.5 text-x5-green" />
                  <span>{route.volunteer.level}</span>
                  <span>·</span>
                  <span className="font-semibold text-x5-green">
                    {route.volunteer.x5ClubPoints + (isCompleted ? route.x5ClubPointsReward : 0)} б.
                    X5 Клуба
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-x5-mint px-3 py-1.5 text-right">
              <div className="text-[10px] font-semibold uppercase text-x5-dark/70">
                Награда за рейс
              </div>
              <div className="text-sm font-extrabold text-x5-dark">
                +{route.x5ClubPointsReward} баллов X5 Клуба
              </div>
            </div>
          </div>

          {/* Метрики рейса */}
          <div className="my-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                <Package className="h-3.5 w-3.5" /> Вес
              </div>
              <div className="mt-0.5 text-sm font-bold text-slate-900">
                {route.totalWeightKg} кг
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                <Truck className="h-3.5 w-3.5" /> Путь
              </div>
              <div className="mt-0.5 text-sm font-bold text-slate-900">
                {route.totalDistanceKm} км
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" /> Время
              </div>
              <div className="mt-0.5 text-sm font-bold text-emerald-700">
                {route.totalDurationMinutes} мин (−{route.savedMinutes}м)
              </div>
            </div>
          </div>

          {/* Пошаговый маршрут */}
          <div className="space-y-3">
            {route.stops.slice(1).map((stop, idx) => (
              <div
                key={stop.id}
                className="relative flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    stop.type === 'store' ? 'bg-x5-green' : 'bg-blue-600'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{stop.label}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      +{stop.etaMinutes} мин ({stop.distanceFromPrevKm} км)
                    </span>
                  </div>
                  {stop.type === 'store' ? (
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-x5-green" />
                      {route.store.address} · Код выдачи: <b className="font-mono">X5-842</b>
                    </div>
                  ) : (
                    stop.basket && (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {stop.basket.items.map((a) => (
                            <span
                              key={a.item.id}
                              className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm"
                            >
                              {a.item.name} ×{a.allocatedUnits}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <Sparkles className="mr-1 inline h-3 w-3 text-x5-green" />
                          {stop.basket.aiExplanation}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Кнопка завершения + Чек добра */}
          <div className="mt-5 flex flex-wrap gap-3">
            {!isCompleted ? (
              <button
                type="button"
                onClick={() => {
                  onCompleteRoute(route.id);
                  setShowReceipt(true);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-x5-green px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Подтвердить доставку и получить баллы X5 Клуба
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowReceipt((v) => !v)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-x5-dark px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Receipt className="h-4 w-4 text-x5-lime" />
                {showReceipt ? 'Скрыть «Чек добра»' : 'Показать «Чек добра» (/чек)'}
              </button>
            )}
          </div>

          {/* Стилизованный кассовый «Чек добра» — пасхалка к виджету /чек X5 Tech */}
          {showReceipt && (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-amber-50/40 p-5 font-mono text-xs text-slate-800">
              <div className="text-center font-bold tracking-widest">
                ★ X5 КЛУБ × ФОНД «ВЫРУЧАЕМ» ★
              </div>
              <div className="mb-3 text-center text-[11px] text-slate-500">
                ЧЕК ДОБРА #2026-X5 · РЕЙС ЗАВЕРШЁН
              </div>
              <div className="space-y-1.5 border-y border-dashed border-slate-300 py-2.5">
                <div className="flex justify-between">
                  <span>ВОЛОНТЁР:</span>
                  <b>{route.volunteer.name.toUpperCase()}</b>
                </div>
                <div className="flex justify-between">
                  <span>СПАСЕНО ПРОДУКТОВ:</span>
                  <b>{route.totalWeightKg} КГ</b>
                </div>
                <div className="flex justify-between">
                  <span>ЭКВИВАЛЕНТ В ГРЕЧКЕ:</span>
                  <b>🌾 {route.grechkaEquivalentPacks} ПАЧ.</b>
                </div>
                <div className="flex justify-between">
                  <span>НАКОРМЛЕНО СЕМЕЙ:</span>
                  <b>{route.baskets.length} СЕМЬИ</b>
                </div>
                <div className="flex justify-between">
                  <span>СЭКОНОМЛЕНО CO₂:</span>
                  <b>{route.co2SavedKg} КГ</b>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-sm font-extrabold text-x5-dark">
                <span>НАЧИСЛЕНО X5 КЛУБ:</span>
                <span>+{route.x5ClubPointsReward} БАЛЛОВ</span>
              </div>
              <div className="mt-2 text-center text-[10px] text-slate-500">
                Спасибо, что спасаете еду вместе с Выручаем.AI!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
