import { Download, Leaf, Scale, ShieldAlert, TrendingDown, Users } from 'lucide-react';
import { DispatchSummary } from '../types';

interface ImpactDashboardProps {
  summary: DispatchSummary;
}

export function ImpactDashboard({ summary }: ImpactDashboardProps) {
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vyruchaem-ai-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI-карточки */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Спасено продуктов</span>
            <Scale className="h-4 w-4 text-x5-green" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {summary.totalRescuedKg} кг
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-700">
            {summary.rescueRatePercent}% от доступных партий (🌾 {summary.totalGrechkaPacks} пач.
            гречки)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Охват семей (Фонд «Выручаем»)</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {summary.familiesHelped} семей
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            100% соблюдение аллергий и диет
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>ESG-эффект (CO₂)</span>
            <Leaf className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            −{summary.totalCo2SavedKg} кг CO₂
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-700">
            Предотвращено выбросов от утилизации
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Экономия ритейла + логистика</span>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {summary.estimatedDisposalSavingsRub.toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Маршруты быстрее на {summary.avgRouteTimeReductionPercent}% (−{summary.totalSavedMinutes}{' '}
            мин)
          </div>
        </div>
      </div>

      {/* Сравнение До / После */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Сравнение: Ручная координация vs Выручаем.AI (2-opt)
              </h3>
              <p className="text-xs text-slate-500">
                Реальный расчёт по текущим рейсам волонтёров
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-x5-green hover:bg-x5-mint"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт JSON
            </button>
          </div>

          <div className="space-y-4">
            {summary.routes.map((r) => {
              const optPct = Math.round((r.totalDurationMinutes / r.naiveDurationMinutes) * 100);
              return (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">
                      {r.volunteer.name} ({r.store.name} → {r.baskets.length} семьи)
                    </span>
                    <span className="text-emerald-700">
                      {r.totalDurationMinutes} мин вместо {r.naiveDurationMinutes} мин (−
                      {r.savedMinutes} мин)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-x5-green transition-all"
                      style={{ width: `${optPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Журнал безопасности и регламента */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
            <ShieldAlert className="h-4 w-4 text-x5-green" />
            Контроль безопасности и X5 Клуб
          </h3>

          <div className="mb-4 rounded-xl bg-x5-mint/70 p-3.5 text-xs text-x5-dark">
            <div className="font-bold">Мотивация волонтёров (X5 Клуб)</div>
            <div className="mt-1">
              За текущую волну начислено <b>{summary.totalX5PointsIssued} баллов X5 Клуба</b>{' '}
              между {summary.routes.length} волонтёрами.
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Отклонено фильтром регламента X5 ({summary.rejectedItems.length})
          </div>
          {summary.rejectedItems.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Все текущие позиции прошли проверку безопасности. Попробуйте добавить накладную с
              сырой курицей или просрочкой во вкладке «Магазин», чтобы увидеть работу фильтра.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {summary.rejectedItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-red-100 bg-red-50/70 p-2.5 text-xs text-red-800"
                >
                  <b>{item.name}</b> — {item.rejectedReason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
