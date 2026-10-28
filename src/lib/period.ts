// ===== 生理期：實際紀錄 + 預估 =====
// 使用者在日曆點某一天「這天有生理期」→ 存在 days[日期].period。
// 預估以「最近一次實際開始日」為準；有兩次以上的紀錄時，週期天數與經期長度改用自己的平均。
import { fromKey, toKey } from './date';
import type { AppData } from '../types';

export const DEFAULT_CYCLE = 28;
export const DEFAULT_PERIOD_LEN = 5;

export interface PeriodEpisode {
  start: string;
  days: number;
}

const addDays = (key: string, n: number) => {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
const diffDays = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

/** 所有標記為生理期的日期（排序） */
export function actualPeriodDays(days: AppData['days']): string[] {
  return Object.keys(days).filter((k) => days[k]?.period).sort();
}

/** 把實際日期分成一次一次的經期（中間隔 2 天以內算同一次） */
export function episodes(dates: string[]): PeriodEpisode[] {
  const out: PeriodEpisode[] = [];
  for (const k of dates) {
    const last = out.at(-1);
    if (last && diffDays(addDays(last.start, last.days - 1), k) <= 3) {
      last.days = diffDays(last.start, k) + 1;
    } else {
      out.push({ start: k, days: 1 });
    }
  }
  return out;
}

export interface CycleInfo {
  /** 預估用的開始日（最近一次實際，沒有就用設定的上次開始日） */
  lastStart?: string;
  cycleLength: number;
  periodLength: number;
  /** 週期天數是否來自自己的紀錄 */
  learned: boolean;
  nextStart?: string;
}

export function cycleInfo(data: AppData): CycleInfo {
  const set = data.profile?.body.cycle;
  const setLen = set?.lengthDays && set.lengthDays >= 15 && set.lengthDays <= 60 ? set.lengthDays : DEFAULT_CYCLE;
  const eps = episodes(actualPeriodDays(data.days));
  const gaps = eps
    .slice(1)
    .map((e, i) => diffDays(eps[i].start, e.start))
    .filter((g) => g >= 15 && g <= 60)
    .slice(-6);
  const cycleLength = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : setLen;
  // 最後一次可能還沒結束（只標了 1、2 天），長度只看已完成的
  const done = eps.length > 1 ? eps.slice(0, -1) : eps.filter((e) => e.days >= 3);
  const periodLength = done.length
    ? Math.min(10, Math.max(2, Math.round(done.reduce((a, e) => a + e.days, 0) / done.length)))
    : DEFAULT_PERIOD_LEN;
  const lastStart = eps.at(-1)?.start ?? set?.lastStart;
  return {
    lastStart,
    cycleLength,
    periodLength,
    learned: gaps.length > 0,
    nextStart: lastStart ? addDays(lastStart, cycleLength) : undefined,
  };
}

/** 預估的生理期日期（不含已實際標記的日子） */
export function predictedPeriodDays(data: AppData): Set<string> {
  const out = new Set<string>();
  if (data.profile?.gender !== 'female') return out;
  const info = cycleInfo(data);
  if (!info.lastStart) return out;
  const hasActual = actualPeriodDays(data.days).length > 0;
  // 有實際紀錄：只往後預估；只有設定值：前後都推算，方便回看
  const from = hasActual ? 1 : -3;
  for (let n = from; n <= 6; n++) {
    for (let d = 0; d < info.periodLength; d++) {
      const k = addDays(info.lastStart, n * info.cycleLength + d);
      if (!data.days[k]?.period) out.add(k);
    }
  }
  // 本次經期還在進行中：補到平均長度
  if (hasActual) {
    const last = episodes(actualPeriodDays(data.days)).at(-1)!;
    for (let d = last.days; d < info.periodLength; d++) {
      const k = addDays(last.start, d);
      if (!data.days[k]?.period) out.add(k);
    }
  }
  return out;
}

/** 某天是否在經期（實際優先，其次預估）— 給菜單切換經期友善模式用 */
export function isPeriodDay(data: AppData, date: string): 'actual' | 'predicted' | null {
  if (data.days[date]?.period) return 'actual';
  return predictedPeriodDays(data).has(date) ? 'predicted' : null;
}
