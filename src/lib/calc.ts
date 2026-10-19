// ===== 模組二：自動計算（BMI、BMR、TDEE、每日建議熱量、蛋白質、喝水） =====
// 公式與安全規則來源：Notion「APP系統架構」> 模組二
import type { ActivityLevel, Gender, GoalId, UserProfile } from '../types';

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

/** 安全下限：女性 1,200／男性 1,500；「不透露」取中間值 */
export const MIN_KCAL: Record<Gender, number> = {
  female: 1200,
  male: 1500,
  unspecified: 1350,
};

const LOSE_GOALS: GoalId[] = ['lose_fat'];
const GAIN_GOALS: GoalId[] = ['build_muscle', 'pecs', 'shoulders', 'biceps'];

export function ageFromBirthDate(birthDate: string, today = new Date()): number {
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export type BmiBand = 'under' | 'normal' | 'over' | 'obese';
/** 台灣衛福部國健署成人 BMI 分級 */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return 'under';
  if (value < 24) return 'normal';
  if (value < 27) return 'over';
  return 'obese';
}

/** Mifflin-St Jeor；「不透露」取男女公式的中間值（常數 −78） */
export function bmr(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const offset = gender === 'female' ? -161 : gender === 'male' ? 5 : -78;
  return Math.round(base + offset);
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return Math.round(bmrValue * ACTIVITY_FACTOR[activity]);
}

export type CalorieMode = 'lose' | 'maintain' | 'gain';

/**
 * 熱量模式：主要目標（排序第一）是增肌類 → 增肌；
 * 否則只要選了「減重減脂」→ 減脂；其餘選了「增肌塑形」→ 增肌；都沒有 → 維持。
 */
export function calorieMode(goals: GoalId[]): CalorieMode {
  const primary = goals[0];
  if (primary && GAIN_GOALS.includes(primary)) return 'gain';
  if (goals.some((g) => LOSE_GOALS.includes(g))) return 'lose';
  if (goals.includes('build_muscle')) return 'gain';
  return 'maintain';
}

/**
 * 每日建議熱量：減重 TDEE−400（介於 300–500 的中間值）、維持 TDEE、增肌 TDEE+250
 * 安全規則：不低於 BMR，且不低於性別下限。
 */
export function dailyCalorieTarget(gender: Gender, bmrValue: number, tdeeValue: number, mode: CalorieMode): number {
  const raw = mode === 'lose' ? tdeeValue - 400 : mode === 'gain' ? tdeeValue + 250 : tdeeValue;
  const floor = Math.max(bmrValue, MIN_KCAL[gender]);
  return Math.round(Math.max(raw, floor));
}

/** 蛋白質每公斤 1.2–1.6 g，回傳 [下限, 上限] */
export function proteinRange(weightKg: number): [number, number] {
  return [Math.round(weightKg * 1.2), Math.round(weightKg * 1.6)];
}

/** 喝水目標：體重 × 30 ml */
export function waterTargetMl(weightKg: number): number {
  return Math.round(weightKg * 30);
}

/** 剩餘熱量 = 目標 − 已攝取 + 運動消耗（可關閉加回） */
export function remainingKcal(target: number, eaten: number, burned: number, addBack: boolean): number {
  return target - eaten + (addBack ? burned : 0);
}

export interface SafetyNotice {
  level: 'info' | 'warn';
  message: string;
}

/** 安全提示：BMI 過低不推薦減重；未滿 18 歲提示諮詢醫師 */
export function safetyNotices(profile: UserProfile, today = new Date()): SafetyNotice[] {
  const notices: SafetyNotice[] = [];
  const age = ageFromBirthDate(profile.body.birthDate, today);
  const b = bmi(profile.body.weightKg, profile.body.heightCm);
  if (age < 18) notices.push({ level: 'warn', message: '未滿 18 歲，開始計畫前請先諮詢醫師或家長。' });
  if (bmiBand(b) === 'under' && profile.goals.includes('lose_fat'))
    notices.push({ level: 'warn', message: 'BMI 偏低，不建議以減重為目標，已改以維持熱量計算。' });
  return notices;
}

export interface PlanSummary {
  age: number;
  bmi: number;
  bmiBand: BmiBand;
  bmr: number;
  tdee: number;
  mode: CalorieMode;
  targetKcal: number;
  protein: [number, number];
  waterMl: number;
  notices: SafetyNotice[];
}

/** 一次算出「計畫預覽頁」需要的全部數字 */
export function buildPlanSummary(profile: UserProfile, today = new Date()): PlanSummary {
  const { gender, body } = profile;
  const age = ageFromBirthDate(body.birthDate, today);
  const bmiValue = bmi(body.weightKg, body.heightCm);
  const band = bmiBand(bmiValue);
  const bmrValue = bmr(gender, body.weightKg, body.heightCm, age);
  const tdeeValue = tdee(bmrValue, body.activity);
  let mode = calorieMode(profile.goals);
  if (mode === 'lose' && band === 'under') mode = 'maintain';
  return {
    age,
    bmi: bmiValue,
    bmiBand: band,
    bmr: bmrValue,
    tdee: tdeeValue,
    mode,
    targetKcal: dailyCalorieTarget(gender, bmrValue, tdeeValue, mode),
    protein: proteinRange(body.weightKg),
    waterMl: waterTargetMl(body.weightKg),
    notices: safetyNotices(profile, today),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
