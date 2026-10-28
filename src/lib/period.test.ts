import { describe, expect, it } from 'vitest';
import { cycleInfo, episodes, isPeriodDay, predictedPeriodDays } from './period';
import { emptyData } from './storage';
import type { AppData } from '../types';

const female = (): AppData => {
  const d = emptyData();
  d.profile = {
    gender: 'female', goals: ['fitness'], workoutTypes: ['yoga'], level: 'beginner', equipment: ['none'],
    daysPerWeek: 3, minutesPerSession: 30,
    body: { heightCm: 160, weightKg: 55, birthDate: '1998-01-01', activity: 'light', cycle: { lengthDays: 30, lastStart: '2026-09-01' } },
  };
  return d;
};
const mark = (d: AppData, ...keys: string[]) => keys.forEach((k) => (d.days[k] = { waterMl: 0, period: true }));

describe('生理期', () => {
  it('連續或隔 2 天內的日期算同一次', () => {
    expect(episodes(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-30'])).toEqual([
      { start: '2026-10-01', days: 4 },
      { start: '2026-10-30', days: 1 },
    ]);
  });

  it('沒有實際紀錄時，用設定的上次開始日與週期預估', () => {
    const d = female();
    const p = predictedPeriodDays(d);
    expect(p.has('2026-10-01')).toBe(true); // 9/1 + 30
    expect(p.has('2026-10-05')).toBe(true);
    expect(p.has('2026-10-06')).toBe(false);
    expect(cycleInfo(d).nextStart).toBe('2026-10-01');
  });

  it('有實際紀錄後，從最近一次開始日往後預估，並學習自己的週期', () => {
    const d = female();
    mark(d, '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06');
    mark(d, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04');
    const info = cycleInfo(d);
    expect(info.cycleLength).toBe(28);
    expect(info.learned).toBe(true);
    expect(info.periodLength).toBe(4);
    expect(info.nextStart).toBe('2026-10-29');
    const p = predictedPeriodDays(d);
    expect(p.has('2026-10-29')).toBe(true);
    expect(p.has('2026-10-02')).toBe(false); // 已實際標記的不重複
    expect(p.has('2026-09-01')).toBe(false); // 有實際紀錄後不回推舊的預估
    expect(isPeriodDay(d, '2026-10-02')).toBe('actual');
    expect(isPeriodDay(d, '2026-10-30')).toBe('predicted');
  });

  it('男性不預估', () => {
    const d = female();
    d.profile!.gender = 'male';
    expect(predictedPeriodDays(d).size).toBe(0);
  });
});
