import { FoodCategory } from '../types';

const CO2_PER_KG: Record<FoodCategory, number> = {
  bread: 1.5,
  produce: 2.0,
  grocery: 1.6,
  dairy: 3.6,
  sweet: 2.2,
};

/** 1 условная «пачка гречки» = 0.8 кг спасённого базового рациона */
export const GRECHKA_PACK_WEIGHT_KG = 0.8;

/** Средняя стоимость утилизации 1 кг просрочки + логистики для ритейла (₽) */
export const DISPOSAL_COST_PER_KG_RUB = 145;

export function calcCo2SavedKg(category: FoodCategory, weightKg: number): number {
  return Number((weightKg * (CO2_PER_KG[category] ?? 2.2)).toFixed(2));
}

export function calcGrechkaPacks(weightKg: number): number {
  return Math.max(1, Math.round(weightKg / GRECHKA_PACK_WEIGHT_KG));
}

export function calcX5ClubPoints(weightKg: number, minTtlHours: number, stopsCount: number): number {
  const base = 50;
  const weightBonus = Math.round(weightKg * 15);
  const urgencyBonus = minTtlHours < 4 ? 50 : 0;
  const stopsBonus = stopsCount * 20;
  return base + weightBonus + urgencyBonus + stopsBonus;
}
