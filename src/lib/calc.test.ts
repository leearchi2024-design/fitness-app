import { describe, expect, it } from 'vitest';
import {
  ageFromBirthDate,
  bmi,
  bmiBand,
  bmr,
  buildPlanSummary,
  calorieMode,
  dailyCalorieTarget,
  proteinRange,
  remainingKcal,
  tdee,
  waterTargetMl,
} from './calc';
import type { UserProfile } from '../types';

const today = new Date('2026-10-19');

const base: UserProfile = {
  gender: 'female',
  goals: ['lose_fat'],
  workoutTypes: ['yoga', 'strength'],
  level: 'beginner',
  equipment: ['mat', 'dumbbell'],
  daysPerWeek: 3,
  minutesPerSession: 30,
  body: { heightCm: 160, weightKg: 60, birthDate: '1996-05-01', activity: 'light' },
};

describe('模組二：自動計算', () => {
  it('年齡：生日未到要減一歲', () => {
    expect(ageFromBirthDate('1996-05-01', today)).toBe(30);
    expect(ageFromBirthDate('1996-12-01', today)).toBe(29);
  });

  it('BMI = 體重 ÷ 身高(m)²', () => {
    expect(bmi(60, 160)).toBe(23.4);
    expect(bmiBand(17.9)).toBe('under');
    expect(bmiBand(23.4)).toBe('normal');
  });

  it('BMR 使用 Mifflin-St Jeor', () => {
    // 女：10×60 + 6.25×160 − 5×30 − 161 = 1289
    expect(bmr('female', 60, 160, 30)).toBe(1289);
    // 男：10×75 + 6.25×175 − 5×30 + 5 = 1698.75 → 1699
    expect(bmr('male', 75, 175, 30)).toBe(1699);
  });

  it('TDEE = BMR × 活動係數', () => {
    expect(tdee(1289, 'light')).toBe(1772);
  });

  it('主要目標決定熱量模式', () => {
    expect(calorieMode(['lose_fat', 'core'])).toBe('lose');
    expect(calorieMode(['build_muscle'])).toBe('gain');
    expect(calorieMode(['glute_lift', 'lose_fat'])).toBe('lose');
    expect(calorieMode(['flexibility', 'relax'])).toBe('maintain');
  });

  it('安全規則：建議熱量不低於 BMR 與性別下限', () => {
    expect(dailyCalorieTarget('female', 1289, 1772, 'lose')).toBe(1372);
    expect(dailyCalorieTarget('female', 1100, 1320, 'lose')).toBe(1200);
    expect(dailyCalorieTarget('male', 1450, 1700, 'lose')).toBe(1500);
    expect(dailyCalorieTarget('male', 1699, 2336, 'gain')).toBe(2586);
  });

  it('蛋白質、喝水、剩餘熱量', () => {
    expect(proteinRange(60)).toEqual([72, 96]);
    expect(waterTargetMl(60)).toBe(1800);
    expect(remainingKcal(1500, 900, 200, true)).toBe(800);
    expect(remainingKcal(1500, 900, 200, false)).toBe(600);
  });

  it('BMI 過低時不以減重計算，並給提示', () => {
    const thin: UserProfile = { ...base, body: { ...base.body, weightKg: 45 } };
    const s = buildPlanSummary(thin, today);
    expect(s.bmiBand).toBe('under');
    expect(s.mode).toBe('maintain');
    expect(s.notices.some((n) => n.message.includes('BMI'))).toBe(true);
  });

  it('未滿 18 歲提示諮詢醫師', () => {
    const teen: UserProfile = { ...base, body: { ...base.body, birthDate: '2010-01-01' } };
    expect(buildPlanSummary(teen, today).notices.some((n) => n.message.includes('18'))).toBe(true);
  });
});
