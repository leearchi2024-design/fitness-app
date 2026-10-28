import { describe, expect, it } from 'vitest';
import { comboTotals, CVS_COMBOS, FOOD_BY_ID, FOODS, fromNotion } from './foods';
import { foodArtSvg, parseArt, unknownParts } from '../lib/foodArt';
import { mealBudget, suggestCombos, suggestMeals } from '../lib/recipes';

describe('食物資料庫（Notion 飲食資料庫）', () => {
  it('早午晚餐都有外食與自煮', () => {
    for (const c of ['早餐', '午餐', '晚餐']) {
      expect(FOODS.some((f) => f.category === c && f.where === '外食')).toBe(true);
      expect(FOODS.some((f) => f.category === c && f.where === '自煮')).toBe(true);
    }
  });

  it('id 不重複', () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });

  it('熱量與三大營養素大致一致（誤差 20% 內）', () => {
    for (const f of FOODS.filter((x) => x.kcal > 50)) {
      const est = f.proteinG * 4 + f.carbsG * 4 + f.fatG * 9;
      expect(Math.abs(est - f.kcal) / f.kcal, f.name).toBeLessThan(0.2);
    }
  });

  it('每道菜的插畫都畫得出來', () => {
    for (const f of FOODS.filter((x) => x.art)) {
      expect(unknownParts(f.art!), f.name).toEqual([]);
      expect(foodArtSvg(f.art!)).toContain('<svg');
    }
  });

  it('Notion 吃掉「*」的插畫配方也看得懂', () => {
    expect(parseArt('plate|pancake1.4,leafy.7').parts).toEqual([{ name: 'pancake', scale: 1.4 }, { name: 'leafy', scale: 0.7 }]);
    expect(parseArt('plate|pancake*1.4,leafy*.7').parts).toEqual([{ name: 'pancake', scale: 1.4 }, { name: 'leafy', scale: 0.7 }]);
  });

  it('Notion 欄位轉換', () => {
    const f = fromNotion({ id: 'x', 食物名稱: '測試', APP代號: 'home_lunch_99', 類型: '自煮', 餐別: '午餐', 熱量: 500, 評級: '少吃' });
    expect(f).toMatchObject({ id: 'home_lunch_99', category: '午餐', where: '自煮', meal: 'lunch', grade: 'limit' });
  });

  it('超商組合的單品都存在，合計正確', () => {
    for (const c of CVS_COMBOS) {
      c.itemIds.forEach((id) => expect(FOOD_BY_ID[id], id).toBeDefined());
      expect(comboTotals(c).kcal).toBe(c.itemIds.reduce((s, id) => s + FOOD_BY_ID[id].kcal, 0));
    }
  });
});

describe('食譜建議', () => {
  it('剩餘熱量依比例分給還沒吃的餐', () => {
    // 早上都還沒吃：早餐拿 25 /（25+35+30）
    expect(mealBudget({ meal: 'breakfast', remainingKcal: 1800, eatenMeals: [] })).toBe(500);
    // 已經是晚餐：剩多少都給晚餐
    expect(mealBudget({ meal: 'dinner', remainingKcal: 450, eatenMeals: ['breakfast', 'lunch'] })).toBe(450);
    // 午餐沒記錄就到晚餐：單餐上限是每日的 30% × 1.4
    expect(mealBudget({ meal: 'dinner', remainingKcal: 1500, eatenMeals: [], dailyKcal: 1500 })).toBe(630);
  });

  it('減脂時推薦的晚餐不超過預算太多、不推「少吃」', () => {
    const list = suggestMeals({ meal: 'dinner', remainingKcal: 450, proteinLeftG: 40, mode: 'lose', eatenMeals: ['breakfast', 'lunch'] });
    expect(list).toHaveLength(5);
    for (const s of list) {
      expect(s.food.category).toBe('晚餐');
      expect(s.food.kcal).toBeLessThanOrEqual(450 * 1.25);
      expect(s.food.grade).not.toBe('limit');
    }
  });

  it('可以只看自己煮', () => {
    const list = suggestMeals({ meal: 'lunch', remainingKcal: 1200, proteinLeftG: 60, mode: 'gain', eatenMeals: ['breakfast'], where: '自煮' });
    expect(list.every((s) => s.food.where === '自煮')).toBe(true);
  });

  it('超商組合依目標排序', () => {
    expect(suggestCombos('lunch', 'lose')[0].goal).toBe('減脂');
    expect(suggestCombos('lunch', 'gain')[0].goal).toBe('增肌');
  });
});
