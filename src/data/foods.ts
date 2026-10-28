// ===== 模組 3-4：食物資料庫（來源：Notion「飲食資料庫 › 食物清單」） =====
// src/data/notion/foods.json 保留 Notion 欄位名稱，由 npm run sync 從 Notion 更新；APP代號就是 id，請勿在 Notion 修改。
// 數值為台灣常見份量的概略估計（誤差約 ±15%）。
import type { MealSlot } from '../types';
import foodsRaw from './notion/foods.json';

export type FoodCategory = '早餐' | '午餐' | '晚餐' | '超商' | '手搖飲' | '水果';
export type FoodWhere = '外食' | '自煮';
/** good 推薦、ok 偶爾、limit 少吃 */
export type FoodGrade = 'good' | 'ok' | 'limit';

export interface FoodItem {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: FoodCategory;
  where?: FoodWhere;
  meal?: MealSlot;
  grade: FoodGrade;
  tip?: string;
  /** 插畫配方，交給 lib/foodArt.ts 繪製 */
  art?: string;
}

interface NotionFoodRow {
  id: string;
  食物名稱: string;
  APP代號?: string;
  類型?: string;
  餐別?: string;
  份量?: string;
  熱量?: number | null;
  蛋白質?: number | null;
  碳水?: number | null;
  脂肪?: number | null;
  評級?: string;
  小提醒?: string;
  插畫配方?: string;
}

export const GRADE_LABEL: Record<FoodGrade, string> = { good: '推薦', ok: '偶爾', limit: '少吃' };
const GRADE: Record<string, FoodGrade> = { 推薦: 'good', 偶爾: 'ok', 少吃: 'limit' };
const MEAL: Record<string, MealSlot> = { 早餐: 'breakfast', 午餐: 'lunch', 晚餐: 'dinner', 點心: 'snack' };

export const FOOD_CATEGORIES: FoodCategory[] = ['早餐', '午餐', '晚餐', '超商', '手搖飲', '水果'];

/** Notion 列 → APP 食物 */
export function fromNotion(r: NotionFoodRow): FoodItem {
  const type = r.類型 ?? '';
  const meal = r.餐別 ? MEAL[r.餐別] : undefined;
  const isMealType = type === '外食' || type === '自煮';
  const category: FoodCategory = isMealType
    ? ((r.餐別 === '早餐' || r.餐別 === '午餐' || r.餐別 === '晚餐' ? r.餐別 : '午餐') as FoodCategory)
    : (FOOD_CATEGORIES.includes(type as FoodCategory) ? (type as FoodCategory) : '超商');
  return {
    id: r.APP代號 || r.id,
    name: r.食物名稱,
    serving: r.份量 ?? '1 份',
    kcal: Math.round(r.熱量 ?? 0),
    proteinG: r.蛋白質 ?? 0,
    carbsG: r.碳水 ?? 0,
    fatG: r.脂肪 ?? 0,
    category,
    where: isMealType ? (type as FoodWhere) : undefined,
    meal,
    grade: GRADE[r.評級 ?? ''] ?? 'ok',
    tip: r.小提醒 || undefined,
    art: r.插畫配方 || undefined,
  };
}

export const FOODS: FoodItem[] = (foodsRaw as NotionFoodRow[]).filter((r) => r.食物名稱).map(fromNotion);

export const FOOD_BY_ID: Record<string, FoodItem> = Object.fromEntries(FOODS.map((f) => [f.id, f]));
const FOOD_BY_NAME = new Map(FOODS.map((f) => [f.name, f]));
export const foodByName = (name: string) => FOOD_BY_NAME.get(name);
/** 不重複的食物名稱（輸入框建議用） */
export const FOOD_NAMES = [...new Set(FOODS.map((f) => f.name))];

/** 超商（7-11／全家）早午晚組合（Notion 飲食資料庫「超商組合 早午晚」） */
export interface ComboMeal {
  id: string;
  meal: MealSlot;
  goal: '增肌' | '減脂' | '方便';
  title: string;
  itemIds: string[];
  note: string;
}

export const CVS_COMBOS: ComboMeal[] = [
  { id: 'combo_1', meal: 'breakfast', goal: '增肌', title: '增肌早餐', itemIds: ['cvs_rice_ball', 'cvs_tea_egg', 'cvs_tea_egg', 'cvs_soy'], note: '蛋白質 30g 以上，練前練後都適合' },
  { id: 'combo_2', meal: 'breakfast', goal: '減脂', title: '減脂早餐', itemIds: ['cvs_sweet_pot', 'cvs_tea_egg', 'cvs_soy'], note: '地瓜飽足感高，撐到中午不嘴饞' },
  { id: 'combo_3', meal: 'breakfast', goal: '方便', title: '三分鐘早餐', itemIds: ['cvs_yogurt', 'cvs_banana', 'cvs_tea_egg'], note: '不用微波，邊走邊吃' },
  { id: 'combo_4', meal: 'lunch', goal: '增肌', title: '雞胸飯糰組', itemIds: ['cvs_chicken', 'cvs_rice_ball', 'cvs_salad'], note: '超商午餐的標準答案' },
  { id: 'combo_5', meal: 'lunch', goal: '減脂', title: '高蛋白低碳組', itemIds: ['cvs_chicken', 'cvs_salad', 'cvs_tea_egg', 'cvs_milk'], note: '碳水低、蛋白質 40g' },
  { id: 'combo_6', meal: 'lunch', goal: '方便', title: '關東煮地瓜組', itemIds: ['cvs_oden', 'cvs_sweet_pot'], note: '冬天吃很暖，湯少喝' },
  { id: 'combo_7', meal: 'dinner', goal: '減脂', title: '輕晚餐', itemIds: ['cvs_chicken', 'cvs_chawan', 'cvs_greens'], note: '不到 300 大卡，蛋白質 30g' },
  { id: 'combo_8', meal: 'dinner', goal: '增肌', title: '練後晚餐', itemIds: ['cvs_chicken', 'cvs_rice_ball', 'cvs_protein'], note: '練完 1 小時內吃，蛋白質近 50g' },
  { id: 'combo_9', meal: 'dinner', goal: '方便', title: '暖胃關東煮', itemIds: ['cvs_oden', 'cvs_tea_egg'], note: '加班晚歸也吃得到' },
];

export function comboItems(c: ComboMeal): FoodItem[] {
  return c.itemIds.map((id) => FOOD_BY_ID[id]).filter(Boolean);
}

export function comboTotals(c: ComboMeal) {
  return comboItems(c).reduce(
    (t, f) => ({ kcal: t.kcal + f.kcal, proteinG: t.proteinG + f.proteinG, carbsG: t.carbsG + f.carbsG, fatG: t.fatG + f.fatG }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** 手搖飲甜度（大杯，相對無糖增加的熱量）— Notion「手搖飲速查」 */
export const DRINK_SUGAR: { label: string; kcal: number }[] = [
  { label: '全糖', kcal: 200 }, { label: '少糖', kcal: 140 }, { label: '半糖', kcal: 100 },
  { label: '微糖', kcal: 60 }, { label: '一分糖', kcal: 20 }, { label: '無糖', kcal: 0 },
];

/** 手搖飲加料（一份） */
export const DRINK_TOPPINGS: { label: string; kcal: number }[] = [
  { label: '寒天／愛玉', kcal: 25 }, { label: '蘆薈', kcal: 50 }, { label: '椰果', kcal: 90 }, { label: '仙草', kcal: 60 },
  { label: '珍珠', kcal: 150 }, { label: '芋圓', kcal: 160 }, { label: '布丁', kcal: 180 }, { label: '奶蓋', kcal: 150 },
];
