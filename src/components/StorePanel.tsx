import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react';
import { FoodBatchItem, Store } from '../types';
import { CATEGORY_LABELS, DEMO_INVOICE_PRESETS, TAG_LABELS } from '../data/mockData';
import { parseInvoiceText } from '../services/aiParser';

interface StorePanelProps {
  stores: Store[];
  items: FoodBatchItem[];
  onAddItems: (newItems: FoodBatchItem[]) => void;
  onRemoveItem: (id: string) => void;
}

export function StorePanel({ stores, items, onAddItems, onRemoveItem }: StorePanelProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id ?? 'store-1');
  const [invoiceText, setInvoiceText] = useState<string>(DEMO_INVOICE_PRESETS[0].text);
  const [previewItems, setPreviewItems] = useState<FoodBatchItem[]>([]);

  const handleParse = () => {
    const parsed = parseInvoiceText(invoiceText, selectedStoreId);
    setPreviewItems(parsed);
  };

  const handleCommit = () => {
    if (previewItems.length === 0) return;
    onAddItems(previewItems);
    setPreviewItems([]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Левая колонка: AI-парсер накладной */}
      <div className="space-y-5 lg:col-span-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-x5-mint text-x5-green">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI-приёмка партии фудшеринга
              </h2>
              <p className="text-xs text-slate-500">
                Вставьте текст накладной или продиктуйте остатки — AI проверит регламент X5
              </p>
            </div>
          </div>

          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Магазин / Даркстор
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-x5-green focus:bg-white focus:outline-none"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.address}
              </option>
            ))}
          </select>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {DEMO_INVOICE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSelectedStoreId(preset.storeId);
                  setInvoiceText(preset.text);
                  setPreviewItems(parseInvoiceText(preset.text, preset.storeId));
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-x5-green hover:bg-x5-mint hover:text-x5-dark"
              >
                ⚡ {preset.label}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={invoiceText}
            onChange={(e) => setInvoiceText(e.target.value)}
            placeholder="Например: 6 батонов до 3ч, 4 кг помидоров до 10ч, 2 кг сырой курицы до 5ч..."
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-x5-green focus:outline-none"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleParse}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-x5-dark px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Sparkles className="h-4 w-4 text-x5-lime" />
              Разобрать и проверить регламент
            </button>
          </div>
        </div>

        {/* Предпросмотр разбора */}
        {previewItems.length > 0 && (
          <div className="rounded-2xl border border-x5-green/40 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-x5-green" />
                Результат проверки ({previewItems.length} поз.)
              </h3>
              <button
                type="button"
                onClick={handleCommit}
                className="flex items-center gap-1.5 rounded-xl bg-x5-green px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить в систему
              </button>
            </div>

            <div className="space-y-2">
              {previewItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 text-xs ${
                    item.rejectedReason
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-emerald-200 bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900">
                      {item.name} · {item.quantity} {item.unit} ({(item.quantity * item.weightKgPerUnit).toFixed(1)} кг)
                    </div>
                    <span className="shrink-0 rounded-md bg-white px-2 py-0.5 font-semibold text-slate-700">
                      TTL {item.ttlHours}ч
                    </span>
                  </div>
                  {item.rejectedReason ? (
                    <div className="mt-1.5 flex items-center gap-1.5 font-medium text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {item.rejectedReason}
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Допущено · {CATEGORY_LABELS[item.category]}</span>
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                        >
                          {TAG_LABELS[t]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Правая колонка: текущие партии по магазинам */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5 text-x5-green" />
            <h2 className="text-base font-bold text-slate-900">
              Активные партии в сети ({items.length})
            </h2>
          </div>
          <span className="rounded-full bg-x5-mint px-3 py-1 text-xs font-bold text-x5-dark">
            Всего:{' '}
            {items
              .filter((i) => !i.rejectedReason)
              .reduce((s, i) => s + i.quantity * i.weightKgPerUnit, 0)
              .toFixed(1)}{' '}
            кг допущено
          </span>
        </div>

        <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const store = stores.find((s) => s.id === item.storeId);
            const urgent = !item.rejectedReason && item.ttlHours < 4;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                  item.rejectedReason
                    ? 'border-red-200 bg-red-50/50 opacity-80'
                    : urgent
                      ? 'border-red-200 bg-white'
                      : 'border-slate-100 bg-slate-50/60 hover:bg-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
                    <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {store?.name}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        item.rejectedReason
                          ? 'bg-red-100 text-red-700'
                          : urgent
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.rejectedReason ? 'Отклонено' : `TTL ${item.ttlHours}ч`}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      {item.quantity} {item.unit} ·{' '}
                      <b className="text-slate-700">
                        {(item.quantity * item.weightKgPerUnit).toFixed(1)} кг
                      </b>
                    </span>
                    <span>•</span>
                    <span>{CATEGORY_LABELS[item.category]}</span>
                    {item.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700">
                          Теги: {item.tags.map((t) => TAG_LABELS[t]).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                  {item.rejectedReason && (
                    <div className="mt-1 text-xs font-medium text-red-600">
                      ⛔ {item.rejectedReason}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  title="Удалить позицию"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
