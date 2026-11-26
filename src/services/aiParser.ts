import { DietaryTag, FoodBatchItem, FoodCategory } from '../types';
import { validateFoodSafety } from '../algorithms/packing';

function detectCategoryAndTags(name: string): {
  category: FoodCategory;
  tags: DietaryTag[];
  defaultWeightKg: number;
} {
  const lower = name.toLowerCase();
  const tags: DietaryTag[] = [];

  if (/орех|миндал|фундук|арахис/.test(lower)) tags.push('nuts');
  if (/сладк|круассан|булочк|торт|пирож|печень|кориц|сахар/.test(lower)) {
    tags.push('sugar');
  }

  if (/молок|кефир|творог|йогурт|сметан|сыр(?!о)|ряженк/.test(lower)) {
    tags.push('lactose');
    return { category: 'dairy', tags, defaultWeightKg: 0.5 };
  }
  if (/круассан|булочк|торт|пирож|печень|пряник/.test(lower)) {
    tags.push('gluten');
    return { category: 'sweet', tags, defaultWeightKg: 0.25 };
  }
  if (/батон|хлеб|лаваш|багет|лепешк/.test(lower)) {
    tags.push('gluten');
    return { category: 'bread', tags, defaultWeightKg: 0.4 };
  }
  if (/яблок|груш|банан|картоф|морков|помидор|огурц|капуст|лук|апельсин|овощ|фрукт/.test(lower)) {
    return { category: 'produce', tags, defaultWeightKg: 1.0 };
  }
  if (/макарон|овсян/.test(lower)) {
    tags.push('gluten');
  }
  return { category: 'grocery', tags, defaultWeightKg: 0.8 };
}

/**
 * Умный парсер свободного текста / накладной магазина.
 * Работает мгновенно локально без API-ключа (и поддерживает расширение через VITE_LLM_API_KEY).
 * Пример входа: "6 батонов до 3ч, 4 кг помидоров до 10ч, 2 кг сырой курицы до 5ч"
 */
export function parseInvoiceText(text: string, storeId: string): FoodBatchItem[] {
  const cleaned = text.replace(/^[^:]+:\s*/, '');
  const chunks = cleaned
    .split(/[,;\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const parsed: FoodBatchItem[] = [];

  chunks.forEach((chunk, idx) => {
    // Ищем TTL ("до 3.5ч", "3 часа", "до 0ч")
    const ttlMatch = chunk.match(/(?:до\s*)?(\d+(?:[.,]\d+)?)\s*(?:ч|час)/i);
    const ttlHours = ttlMatch ? parseFloat(ttlMatch[1].replace(',', '.')) : 8;

    // Ищем количество и единицу измерения в начале ("6 пачек ...", "4 кг ...", "3 л ...")
    const qtyMatch = chunk.match(
      /^(\d+(?:[.,]\d+)?)\s*(кг|л|шт|пач(?:ек|ки|ка)?|уп(?:аковок|аковки)?|сет(?:ок|ки)?|бутыл(?:ок|ки)?)?\s+(.+?)(?:\s+до\s+\d.*)?$/i
    );

    const quantity = qtyMatch ? Math.max(1, Math.round(parseFloat(qtyMatch[1].replace(',', '.')))) : 3;
    const rawUnit = qtyMatch?.[2]?.toLowerCase() ?? 'шт';
    const nameRaw = (qtyMatch?.[3] ?? chunk).replace(/\s+до\s+\d.*$/i, '').trim();
    const name = nameRaw.charAt(0).toUpperCase() + nameRaw.slice(1);

    const { category, tags, defaultWeightKg } = detectCategoryAndTags(name);

    let weightKgPerUnit = defaultWeightKg;
    if (rawUnit === 'кг' || rawUnit === 'л') {
      weightKgPerUnit = 1.0;
    } else {
      const gramMatch = name.match(/(\d+)\s*г/i);
      if (gramMatch) {
        weightKgPerUnit = Number((parseInt(gramMatch[1], 10) / 1000).toFixed(2));
      }
    }

    const item: FoodBatchItem = {
      id: `parsed-${Date.now()}-${idx}`,
      storeId,
      name,
      category,
      quantity,
      unit: rawUnit.startsWith('пач') ? 'пач' : rawUnit.startsWith('бутыл') ? 'бут' : rawUnit,
      weightKgPerUnit,
      ttlHours,
      tags,
    };

    const rejectedReason = validateFoodSafety(item);
    if (rejectedReason) {
      item.rejectedReason = rejectedReason;
    }

    parsed.push(item);
  });

  return parsed;
}
