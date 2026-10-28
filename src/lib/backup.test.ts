import { describe, expect, it } from 'vitest';
import { BackupError, backupFileName, buildBackup, describeBackup, parseBackup } from './backup';
import { emptyData } from './storage';

const sample = () => {
  const d = emptyData();
  d.foods.push({ id: 'f1', date: '2026-10-28', meal: 'lunch', name: '雞腿便當', kcal: 850, source: 'photo', photoId: 'p_1' });
  d.workouts.push({ id: 'w1', date: '2026-10-28', title: '臀・腿｜30 分鐘', minutes: 30, kcal: 160, exerciseIds: ['s01'] });
  return d;
};

describe('備份與還原', () => {
  it('備份後可以完整還原（含貼紙）', () => {
    const b = buildBackup(sample(), { p_1: 'data:image/webp;base64,AAAA' }, new Date('2026-10-28T06:00:00Z'));
    const back = parseBackup(JSON.stringify(b));
    expect(back.data).toEqual(sample());
    expect(back.photos).toEqual({ p_1: 'data:image/webp;base64,AAAA' });
    expect(describeBackup(back)).toContain('運動 1 次、飲食 1 筆、身體紀錄 0 筆、貼紙 1 張');
  });

  it('不是備份檔時給看得懂的錯誤', () => {
    expect(() => parseBackup('hello')).toThrow(BackupError);
    expect(() => parseBackup('{"foo":1}')).toThrow('不是練起來的備份檔');
  });

  it('較新版本的備份要求先更新', () => {
    const b = { ...buildBackup(sample(), {}), version: 99 };
    expect(() => parseBackup(JSON.stringify(b))).toThrow('較新的版本');
  });

  it('缺欄位時補預設值、忽略不是圖片的照片資料', () => {
    const b = { app: 'lianqilai-fitness', version: 1, exportedAt: 'x', data: { profile: null }, photos: { a: 'javascript:alert(1)', b: 'data:image/png;base64,AA' } };
    const back = parseBackup(JSON.stringify(b));
    expect(back.data.foods).toEqual([]);
    expect(back.data.settings.addBackExerciseKcal).toBe(true);
    expect(Object.keys(back.photos)).toEqual(['b']);
  });

  it('檔名帶日期', () => {
    expect(backupFileName(new Date(2026, 9, 28))).toBe('lianqilai-backup-20261028.json');
  });
});
