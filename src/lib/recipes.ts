// ===== 模組四：食譜建議（第一版） =====
// 依「這一餐還能吃多少」＋目標（減脂／維持／增肌）＋還差多少蛋白質，從 Notion 飲食資料庫挑餐點。
import { comboTotals, CVS_COMBOS, FOODS, type ComboMeal, type FoodItem, type FoodWhere } from '../data/foods';
import type { CalorieMode } from './calc';
import type { MealSlot } from '../types';

/** 一天熱量的建議分配 */
export const MEAL_SHARE: Record<MealSlot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
const ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealContext {
  meal: MealSlot;
  /** 今天剩餘熱量（已扣掉吃過的） */
  remainingKcal: number;
  /** 今天還差的蛋白質（g） */
  proteinLeftG: number;
  mode: CalorieMode;
  /** 今天已經記錄過的餐別 */
  eatenMeals: MealSlot[];
  /** 每日建議熱量：用來限制單餐上限（前面的餐沒記錄時，不會把整天的量都推到這一餐） */
  dailyKcal?: number;
  where?: FoodWhere | null;
}

/** 這一餐建議吃多少：把剩餘熱量依比例分給「還沒吃的餐」 */
export function mealBudget(ctx: Pick<MealContext, 'meal' | 'remainingKcal' | 'eatenMeals' | 'dailyKcal'>): number {
  const idx = ORDER.indexOf(ctx.meal);
  // 正在選的這餐，加上之後還沒吃的正餐（點心不搶正餐預算）
  const upcoming = ORDER.filter((m, i) => (m === ctx.meal || (i > idx && !ctx.eatenMeals.includes(m))) && (m !== 'snack' || ctx.meal === 'snack'));
  const total = upcoming.reduce((s, m) => s + MEAL_SHARE[m], 0) || 1;
  let budget = (Math.max(0, ctx.remainingKcal) * MEAL_SHARE[ctx.meal]) / total;
  if (ctx.dailyKcal) budget = Math.min(budget, ctx.dailyKcal * MEAL_SHARE[ctx.meal] * 1.4);
  return Math.round(budget / 10) * 10;
}

export interface Suggestion {
  food: FoodItem;
  score: number;
  reasons: string[];
}

const GRADE_SCORE = { good: 3, ok: 0.5, limit: -4 } as const;

function candidates(meal: MealSlot, where?: FoodWhere | null): FoodItem[] {
  if (meal === 'snack') return FOODS.filter((f) => f.category === '水果' || f.category === '手搖飲' || (f.category === '超商' && f.kcal <= 200));
  const cat = meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐';
  return FOODS.filter((f) => f.category === cat && (!where || f.where === where));
}

/** 為這一餐打分數，回傳排序好的建議 */
export function suggestMeals(ctx: MealContext, limit = 5): Suggestion[] {
  const budget = mealBudget(ctx);
  const proteinWeight = ctx.mode === 'maintain' ? 1 : 1.6;
  const list = candidates(ctx.meal, ctx.where).map((food): Suggestion => {
    const reasons: string[] = [];
    let score = GRADE_SCORE[food.grade];
    if (food.grade === 'good') reasons.push('推薦');

    // 熱量貼近這餐的預算：超過扣比較多
    if (budget > 0) {
      const diff = (food.kcal - budget) / budget;
      score -= diff > 0 ? diff * 8 : -diff * 3;
      if (Math.abs(diff) <= 0.2) reasons.push('熱量剛好');
      else if (diff < -0.2 && ctx.meal !== 'snack') reasons.push('熱量較低');
      if (diff > 0.25) reasons.push('會超過');
    } else {
      score -= food.kcal / 150;
    }

    // 蛋白質密度（每 100 大卡幾克）
    const density = food.kcal ? (food.proteinG / food.kcal) * 100 : 0;
    score += density * 0.5 * proteinWeight;
    if (food.proteinG >= 25) reasons.push('高蛋白');
    if (ctx.proteinLeftG > 0 && food.proteinG >= Math.min(25, ctx.proteinLeftG)) score += 1;

    // 目標
    if (ctx.mode === 'lose' && food.fatG >= 25) score -= 2;
    if (ctx.mode === 'gain' && food.carbsG >= 45 && food.proteinG >= 25) {
      score += 1;
      reasons.push('增肌好搭配');
    }
    return { food, score, reasons: [...new Set(reasons)].slice(0, 3) };
  });
  return list.sort((a, b) => b.score - a.score || a.food.kcal - b.food.kcal).slice(0, limit);
}

/** 超商組合：依目標排序（減脂 → 減脂組先；增肌 → 增肌組先） */
export function suggestCombos(meal: MealSlot, mode: CalorieMode): (ComboMeal & { totals: ReturnType<typeof comboTotals> })[] {
  const want = mode === 'lose' ? '減脂' : mode === 'gain' ? '增肌' : '方便';
  return CVS_COMBOS.filter((c) => meal === 'snack' || c.meal === meal)
    .map((c) => ({ ...c, totals: comboTotals(c) }))
    .sort((a, b) => Number(b.goal === want) - Number(a.goal === want));
}
