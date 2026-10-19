// ===== 模組五：動作資料 =====
// src/data/notion/*.json 保留 Notion 原始欄位名稱，之後可直接用同步腳本從 Notion 匯出覆蓋。
// 這支檔案負責把三個資料庫轉成 APP 統一使用的 Exercise 格式。
import type { Difficulty, Exercise } from '../types';
import strengthRaw from './notion/strength.json';
import yogaRaw from './notion/yoga.json';
import cardioRaw from './notion/cardio.json';

interface StrengthRow {
  動作名稱: string; 主要肌群: string; 動作要點: string; 器材: string;
  常見錯誤: string; 建議次數組數: string; 訓練部位: string[]; 難度: string;
}
interface YogaRow {
  體式名稱: string; 英文名稱: string; 作用部位: string[]; 停留時間: string;
  功效: string; 注意事項: string; 經期適合: boolean; 難度: string; 體式類別: string;
}
interface CardioRow {
  動作名稱: string; 動作要點: string; 建議時間: string; 強度: string; 用途: string[];
  簡化版: string; 訓練部位: string[]; 難度: string; 需要跳躍: boolean;
}

const fromStrength = (r: StrengthRow, i: number): Exercise => ({
  id: `s${String(i + 1).padStart(2, '0')}`,
  source: 'strength',
  name: r.動作名稱,
  bodyParts: r.訓練部位,
  difficulty: r.難度 as Difficulty,
  equipment: r.器材,
  muscles: r.主要肌群,
  cues: r.動作要點,
  cautions: r.常見錯誤,
  dose: r.建議次數組數,
  jumping: false,
  // 重訓動作未標經期屬性：棒式、死蟲式等核心強壓動作視為不適合
  periodFriendly: !r.訓練部位.includes('核心'),
  tags: [r.器材],
});

const fromYoga = (r: YogaRow, i: number): Exercise => ({
  id: `y${String(i + 1).padStart(2, '0')}`,
  source: 'yoga',
  name: r.體式名稱,
  nameEn: r.英文名稱,
  bodyParts: r.作用部位,
  difficulty: r.難度 as Difficulty,
  equipment: '瑜珈墊',
  cues: r.功效,
  cautions: r.注意事項,
  dose: r.停留時間,
  jumping: false,
  periodFriendly: r.經期適合,
  tags: [r.體式類別],
});

const fromCardio = (r: CardioRow, i: number): Exercise => ({
  id: `c${String(i + 1).padStart(2, '0')}`,
  source: 'cardio',
  name: r.動作名稱,
  bodyParts: r.訓練部位,
  difficulty: r.難度 as Difficulty,
  equipment: '徒手',
  cues: r.動作要點,
  dose: r.建議時間,
  easier: r.簡化版,
  jumping: r.需要跳躍,
  periodFriendly: r.強度 === '低衝擊',
  tags: [r.強度, ...r.用途],
});

export const EXERCISES: Exercise[] = [
  ...(strengthRaw as StrengthRow[]).map(fromStrength),
  ...(yogaRaw as YogaRow[]).map(fromYoga),
  ...(cardioRaw as CardioRow[]).map(fromCardio),
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const SOURCE_LABEL: Record<Exercise['source'], string> = {
  strength: '重訓',
  yoga: '瑜珈',
  cardio: '有氧',
};

/** 人體圖可點選的肌群（模組 5-1） */
export const BODY_PARTS = ['肩', '手臂', '胸', '背', '核心', '臀', '腿', '全身'] as const;
