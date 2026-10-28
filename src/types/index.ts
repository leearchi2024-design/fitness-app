// ===== 共用型別：對應 Notion「APP系統架構」各模組 =====

// 模組一：初次設定
export type Gender = 'female' | 'male' | 'unspecified';
export type GoalId =
  | 'lose_fat' | 'build_muscle' | 'fitness' | 'flexibility' | 'relax'
  | 'legs_glutes' | 'arms' | 'back_posture' | 'chest' | 'core'
  | 'glute_lift' | 'arm_tone' | 'abs_line' | 'postpartum'
  | 'pecs' | 'shoulders' | 'biceps' | 'six_pack';
export type WorkoutType = 'yoga' | 'strength' | 'cardio' | 'pilates' | 'hiit' | 'stretch';
export type Level = 'beginner' | 'occasional' | 'regular';
export type Equipment = 'none' | 'mat' | 'dumbbell' | 'band' | 'gym';
export type SessionMinutes = 15 | 30 | 45 | 60;

// 模組二：身體資料
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high';

export interface BodyProfile {
  heightCm: number;
  weightKg: number;
  birthDate: string; // YYYY-MM-DD
  activity: ActivityLevel;
  targetWeightKg?: number;
  bodyFatPct?: number;
  girth?: { waist?: number; hip?: number; thigh?: number; arm?: number };
  cycle?: { lengthDays: number; lastStart: string }; // 僅女性顯示
}

export interface UserProfile {
  gender: Gender;
  goals: GoalId[]; // 依拖曳排序，第一個為主要目標，最多 3 個
  workoutTypes: WorkoutType[];
  level: Level;
  equipment: Equipment[];
  daysPerWeek: number; // 1–7（有自訂課表時＝trainingDays 的天數）
  /** 自己安排的訓練日：0＝週一 … 6＝週日；沒有設定時依 daysPerWeek 自動安排 */
  trainingDays?: number[];
  minutesPerSession: SessionMinutes;
  reminderTime?: string; // HH:mm
  body: BodyProfile;
}

// 模組五：動作圖庫（統一格式，由三個 Notion 資料庫轉換而來）
export type ExerciseSource = 'strength' | 'yoga' | 'cardio';
export type Difficulty = '新手' | '中階' | '進階';

export interface Exercise {
  id: string;
  source: ExerciseSource;
  name: string;
  nameEn?: string;
  bodyParts: string[];
  difficulty: Difficulty;
  equipment: string; // 徒手 / 啞鈴 / 瑜珈墊 ...
  muscles?: string;
  cues: string; // 動作要點 / 功效
  cautions?: string; // 常見錯誤 / 注意事項
  dose: string; // 建議次數組數 / 停留時間 / 建議時間
  easier?: string; // 簡化版
  jumping: boolean;
  periodFriendly: boolean;
  tags: string[]; // 體式類別、用途、強度等
  notionId?: string; // 對應 Notion 資料庫的頁面 ID（同步用）
  media?: ExerciseMedia; // 示範影片／動畫（Notion「示範影片」欄位）
}

export interface ExerciseMedia {
  /** svg：動畫或插圖；image：png/jpg/gif/webp；video：mp4/webm/mov */
  kind: 'svg' | 'image' | 'video';
  /** 相對於網站根目錄的路徑，例如 media/strength/s01.svg */
  src: string;
}

// 模組三：日曆與紀錄
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealSlot;
  name: string;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  source: 'manual' | 'search' | 'recent' | 'photo' | 'barcode';
  /** 拍照記錄的貼紙（存在 IndexedDB 的 id） */
  photoId?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  title: string;
  minutes: number;
  kcal: number;
  feeling?: 1 | 2 | 3 | 4 | 5;
  exerciseIds: string[];
}

export interface BodyLog {
  date: string;
  weightKg?: number;
  girth?: BodyProfile['girth'];
  mood?: string;
  note?: string;
}

export interface DayRecord {
  waterMl: number;
  /** 使用者自己標記：這天有生理期 */
  period?: boolean;
}

/** 使用者對某天菜單的調整：移除不喜歡的動作、從動作庫加入新動作 */
export interface PlanEdit {
  removed: string[];
  added: string[];
  /** 移除的動作 id → 換成的動作 id（顯示在原本的位置） */
  replace?: Record<string, string>;
}

export interface AppSettings {
  addBackExerciseKcal: boolean;
  /** 自訂每日喝水目標（ml）；沒填就用體重 × 30 */
  waterTargetMl?: number;
  /** 跟練語音（倒數、動作名稱） */
  voice?: boolean;
  /** 跟練提示音（嗶聲） */
  beep?: boolean;
}

export interface AppData {
  profile: UserProfile | null;
  foods: FoodEntry[];
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  days: Record<string, DayRecord>;
  /** 每天的菜單調整，key = YYYY-MM-DD */
  planEdits: Record<string, PlanEdit>;
  settings: AppSettings;
}
