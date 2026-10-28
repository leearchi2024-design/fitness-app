import { describe, expect, it } from 'vitest';
import { OFFICE_EXERCISES, EXERCISES } from '../data/exercises';
import { buildOfficePlan, officeTiming } from './office';
import { buildWorkoutPlan, filterExercises } from './workout';

describe('辦公室小運動', () => {
  it('資料來自 Notion 辦公室小運動資料庫，且不會混進訓練動作', () => {
    expect(OFFICE_EXERCISES.length).toBeGreaterThan(0);
    expect(OFFICE_EXERCISES.every((e) => e.source === 'office')).toBe(true);
    expect(EXERCISES.some((e) => e.source === 'office')).toBe(false);
    const plan = buildWorkoutPlan({ minutes: 30, types: ['strength', 'yoga', 'cardio'], parts: ['全身'], level: 'regular', equipment: ['none', 'mat'], seed: 'x' });
    expect(plan.blocks.flatMap((b) => b.exercises).some((e) => e.source === 'office')).toBe(false);
    expect(filterExercises({ types: ['stretch'], parts: [], level: 'regular', equipment: ['none'] }).some((e) => e.source === 'office')).toBe(false);
  });

  it('從建議量估計秒數', () => {
    expect(officeTiming('每邊 20–30 秒 × 2 回')).toEqual({ sec: 60, sides: 2 });
    expect(officeTiming('每下停 5 秒 × 10 下 × 2 組')).toEqual({ sec: 100, sides: 1 });
    expect(officeTiming('往後 10 圈 + 往前 10 圈')).toEqual({ sec: 40, sides: 1 });
    expect(officeTiming('每邊停 5 秒 × 5 次')).toEqual({ sec: 25, sides: 2 });
    expect(officeTiming('8–10 次來回')).toEqual({ sec: 50, sides: 1 });
    expect(officeTiming('20–30 秒 × 2 回')).toEqual({ sec: 60, sides: 1 });
  });

  it('依時間配菜單：不超過太多、選的部位都有照顧到', () => {
    for (const minutes of [3, 5, 10]) {
      const p = buildOfficePlan({ minutes, parts: ['neck', 'arm'], equipment: ['椅子'], seed: 's' });
      expect(p.seconds).toBeLessThanOrEqual(minutes * 60 + 20);
      expect(p.exercises.some((e) => e.bodyParts.includes('頸'))).toBe(true);
      expect(p.exercises.some((e) => e.bodyParts.includes('手腕') || e.bodyParts.includes('手臂'))).toBe(true);
    }
  });

  it('沒有的器材不會排進來，左右邊動作拆成兩步', () => {
    const p = buildOfficePlan({ minutes: 15, parts: [], equipment: [], seed: 's' });
    expect(p.exercises.every((e) => e.equipment === '徒手')).toBe(true);
    const twoSide = p.steps.filter((s) => s.side);
    expect(twoSide.length % 2).toBe(0);
  });

  it('同樣的選擇與種子 → 同一份菜單；換一組 → 不同', () => {
    const a = buildOfficePlan({ minutes: 5, parts: ['shoulder'], equipment: ['椅子'], seed: 'r0' });
    const b = buildOfficePlan({ minutes: 5, parts: ['shoulder'], equipment: ['椅子'], seed: 'r0' });
    expect(a.exercises.map((e) => e.id)).toEqual(b.exercises.map((e) => e.id));
    const others = ['r1', 'r2', 'r3'].map((s) => buildOfficePlan({ minutes: 5, parts: ['shoulder'], equipment: ['椅子'], seed: s }).exercises.map((e) => e.id).join());
    expect(others.some((x) => x !== a.exercises.map((e) => e.id).join())).toBe(true);
  });
});
