import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { buildWorkoutPlan, filterExercises, targetParts } from './workout';

describe('動作資料', () => {
  it('三個 Notion 資料庫都有轉入', () => {
    // Notion 之後可能新增動作，所以只檢查每個資料庫都有資料、id 不重複
    expect(EXERCISES.filter((e) => e.source === 'strength').length).toBeGreaterThan(0);
    expect(EXERCISES.filter((e) => e.source === 'yoga').length).toBeGreaterThan(0);
    expect(EXERCISES.filter((e) => e.source === 'cardio').length).toBeGreaterThan(0);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });
});

describe('模組 5-3：菜單推薦', () => {
  const opts = {
    minutes: 30,
    types: ['strength', 'yoga'] as const,
    parts: targetParts(['legs_glutes']),
    level: 'beginner' as const,
    equipment: ['dumbbell'] as const,
    seed: '2026-10-19',
  };

  it('新手不會排到中階以上或跳躍動作', () => {
    const list = filterExercises({ ...opts, types: [...opts.types, 'cardio'], equipment: [...opts.equipment] });
    expect(list.every((e) => e.difficulty === '新手' && !e.jumping)).toBe(true);
  });

  it('沒有的器材不會出現', () => {
    const list = filterExercises({ ...opts, types: [...opts.types], equipment: [] });
    expect(list.some((e) => e.equipment === '啞鈴')).toBe(false);
  });

  it('菜單包含熱身、主訓練、收操，且主訓練時間不超過', () => {
    const plan = buildWorkoutPlan({ ...opts, types: [...opts.types], equipment: [...opts.equipment] }, 60);
    expect(plan.blocks.map((b) => b.label)).toEqual(['熱身', '主訓練', '收操']);
    expect(plan.blocks[1].exercises.length).toBeGreaterThan(0);
    expect(plan.kcal).toBeGreaterThan(0);
  });

  it('同一個種子產生同一份菜單', () => {
    const a = buildWorkoutPlan({ ...opts, types: [...opts.types], equipment: [...opts.equipment] });
    const b = buildWorkoutPlan({ ...opts, types: [...opts.types], equipment: [...opts.equipment] });
    expect(a.blocks[1].exercises.map((e) => e.id)).toEqual(b.blocks[1].exercises.map((e) => e.id));
  });

  it('經期溫和模式只排經期適合的動作', () => {
    const plan = buildWorkoutPlan({ ...opts, types: ['yoga'], equipment: [], periodMode: true });
    expect(plan.blocks.flatMap((b) => b.exercises).every((e) => e.periodFriendly)).toBe(true);
  });
});

describe('一週課表', () => {
  it('自己安排的訓練日優先，沒有就依天數自動安排', async () => {
    const { trainingWeekdays, isTrainingDay } = await import('./workout');
    expect(trainingWeekdays({ daysPerWeek: 3 })).toEqual([0, 2, 4]);
    expect(trainingWeekdays({ daysPerWeek: 2, trainingDays: [5, 1, 1] })).toEqual([1, 5]);
    expect(isTrainingDay([1, 5], new Date(2026, 9, 27))).toBe(true); // 週二
    expect(isTrainingDay([1, 5], new Date(2026, 9, 28))).toBe(false); // 週三
  });

  it('課表提醒：沒選、天天練、連續太多天', async () => {
    const { scheduleNote } = await import('./workout');
    expect(scheduleNote([])).toBe('至少選一天。');
    expect(scheduleNote([0, 1, 2, 3, 4, 5, 6])).toContain('至少留 1 天休息');
    expect(scheduleNote([0, 1, 2, 3])).toContain('連續練 4 天');
    expect(scheduleNote([5, 6, 0, 1])).toContain('連續練 4 天'); // 跨週末也算
    expect(scheduleNote([0, 2, 4])).toBeNull();
  });
});
