// ===== 模組 3-4：食物資料庫（MVP 示範用） =====
// 數值為一般份量的概略估計，正式上線前請改接衛福部食品營養成分資料庫或第三方 API（Notion 待決定事項）。
export interface FoodItem {
  name: string;
  serving: string;
  kcal: number;
  proteinG: number;
  category: '便利商店' | '早餐店' | '手搖飲' | '家常' | '水果' | '外食';
}

export const FOODS: FoodItem[] = [
  { name: '茶葉蛋', serving: '1 顆', kcal: 75, proteinG: 7, category: '便利商店' },
  { name: '御飯糰（鮪魚）', serving: '1 個', kcal: 200, proteinG: 6, category: '便利商店' },
  { name: '雞胸肉（原味）', serving: '1 包 100g', kcal: 120, proteinG: 24, category: '便利商店' },
  { name: '地瓜', serving: '1 條 150g', kcal: 190, proteinG: 2, category: '便利商店' },
  { name: '無糖豆漿', serving: '400 ml', kcal: 140, proteinG: 14, category: '便利商店' },
  { name: '希臘優格', serving: '1 盒 100g', kcal: 95, proteinG: 9, category: '便利商店' },
  { name: '蛋餅', serving: '1 份', kcal: 280, proteinG: 10, category: '早餐店' },
  { name: '鮪魚三明治', serving: '1 份', kcal: 320, proteinG: 13, category: '早餐店' },
  { name: '大冰奶', serving: '1 杯', kcal: 260, proteinG: 4, category: '早餐店' },
  { name: '珍珠奶茶（全糖）', serving: '大杯 700ml', kcal: 650, proteinG: 4, category: '手搖飲' },
  { name: '珍珠奶茶（微糖）', serving: '大杯 700ml', kcal: 450, proteinG: 4, category: '手搖飲' },
  { name: '無糖綠茶', serving: '大杯 700ml', kcal: 0, proteinG: 0, category: '手搖飲' },
  { name: '白飯', serving: '1 碗 200g', kcal: 280, proteinG: 5, category: '家常' },
  { name: '燙青菜', serving: '1 份', kcal: 60, proteinG: 2, category: '家常' },
  { name: '滷雞腿', serving: '1 支', kcal: 260, proteinG: 25, category: '家常' },
  { name: '雞腿便當', serving: '1 個', kcal: 850, proteinG: 35, category: '外食' },
  { name: '牛肉麵', serving: '1 碗', kcal: 700, proteinG: 30, category: '外食' },
  { name: '滷肉飯（小）', serving: '1 碗', kcal: 400, proteinG: 10, category: '外食' },
  { name: '香蕉', serving: '1 根', kcal: 100, proteinG: 1, category: '水果' },
  { name: '芭樂', serving: '1 顆', kcal: 80, proteinG: 1, category: '水果' },
];
