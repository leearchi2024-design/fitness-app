// ===== 辦公室小運動：選時間＋想放鬆的部位 → 自動配出菜單 =====
// 動作來源：Notion「辦公室小運動資料庫」（src/data/notion/office.json），與訓練菜單分開。
import { OFFICE_EXERCISES } from '../data/exercises';
import type { Exercise } from '../types';

export const OFFICE_MINUTES = [3, 5, 10, 15] as const;
export const OFFICE_EQUIPMENT = ['椅子', '牆面/門框', '毛巾'] as const;

/** 畫面上的部位選項 → 資料庫的「訓練部位」 */
export const OFFICE_PARTS: { id: string; label: string; parts: string[]; note: string }[] = [
  { id: 'neck', label: '頸', parts: ['頸'], note: '低頭滑手機、看螢幕' },
  { id: 'shoulder', label: '肩', parts: ['肩'], note: '肩膀緊、聳肩' },
  { id: 'upper', label: '上背', parts: ['上背'], note: '駝背、圓肩' },
  { id: 'chest', label: '胸', parts: ['胸'], note: '胸口悶、含胸' },
  { id: 'arm', label: '手臂・手腕', parts: ['手臂', '手腕'], note: '滑鼠手、打字' },
  { id: 'lower', label: '下背・腰', parts: ['下背', '核心'], note: '久坐腰痠' },
  { id: 'hip', label: '臀・腿', parts: ['臀', '腿'], note: '坐太久、屁股麻' },
];

/** 從頭到腳的順序，菜單會照這個順序排，比較順 */
const FLOW = ['頸', '肩', '上背', '胸', '手臂', '手腕', '核心', '下背', '臀', '腿'];
/** 選的部位動作不夠時，往相鄰部位補 */
const NEAR: Record<string, string[]> = {
  頸: ['肩', '上背'], 肩: ['頸', '上背', '胸'], 上背: ['肩', '胸', '下背'], 胸: ['肩', '上背'],
  手臂: ['手腕', '肩'], 手腕: ['手臂'], 核心: ['下背', '上背'], 下背: ['核心', '臀'], 臀: ['腿', '下背'], 腿: ['臀', '下背'],
};

/** 動作間的轉換時間（秒） */
export const OFFICE_REST_SEC = 5;

export interface OfficeStep {
  e: Exercise;
  /** 這一步的秒數 */
  sec: number;
  /** 左右兩邊做的動作：先右後左 */
  side?: '右邊' | '左邊';
}

/**
 * 從「建議次數組數」估計每邊需要的秒數。
 * 每邊 20–30 秒 × 2 回 → 每邊 60 秒；每下停 5 秒 × 10 下 × 2 組 → 100 秒；往後 10 圈 + 往前 10 圈 → 40 秒
 */
export function officeTiming(dose: string): { sec: number; sides: 1 | 2 } {
  const sides = /每邊/.test(dose) ? 2 : 1;
  const max = (re: RegExp) => {
    const m = dose.match(re);
    return m ? Math.max(+m[1], m[2] ? +m[2] : 0) : 0;
  };
  const secs = max(/(\d+)\s*(?:[–~-]\s*(\d+))?\s*秒/);
  const rounds = max(/[×x]\s*(\d+)\s*(?:[–~-]\s*(\d+))?\s*(?:回|組)/) || 1;
  let count = 0;
  let unit = 3;
  for (const m of dose.matchAll(/(\d+)\s*(?:[–~-]\s*(\d+))?\s*(下|次|圈)/g)) {
    count += Math.max(+m[1], m[2] ? +m[2] : 0);
    unit = m[3] === '圈' ? 2 : m[3] === '次' ? 5 : 3;
  }
  let sec: number;
  if (secs && count) sec = secs * count * rounds;
  else if (secs) sec = secs * rounds;
  else if (count) sec = count * unit * rounds;
  else sec = 30;
  return { sec: Math.min(120, Math.max(15, Math.round(sec / 5) * 5)), sides };
}

export function officeSteps(e: Exercise): OfficeStep[] {
  const t = officeTiming(e.dose);
  return t.sides === 2 ? [{ e, sec: t.sec, side: '右邊' }, { e, sec: t.sec, side: '左邊' }] : [{ e, sec: t.sec }];
}

/** 一個動作總共需要的秒數（含左右與轉換） */
export function officeSeconds(e: Exercise): number {
  return officeSteps(e).reduce((s, x) => s + x.sec + OFFICE_REST_SEC, 0);
}

export interface OfficeOptions {
  minutes: number;
  /** OFFICE_PARTS 的 id；空陣列＝全身放鬆 */
  parts: string[];
  /** 身邊有的器材（徒手一定可以） */
  equipment: string[];
  seed?: string;
}

export interface OfficePlan {
  title: string;
  exercises: Exercise[];
  steps: OfficeStep[];
  seconds: number;
  /** 選的部位動作不夠，有加入相鄰部位 */
  widened: boolean;
}

export function buildOfficePlan(o: OfficeOptions, pool: Exercise[] = OFFICE_EXERCISES): OfficePlan {
  const rand = seeded(o.seed ?? 'office');
  const target = o.minutes * 60;
  const equip = new Set(['徒手', ...o.equipment]);
  const usable = pool.filter((e) => equip.has(e.equipment));
  const chosen = o.parts.length ? OFFICE_PARTS.filter((p) => o.parts.includes(p.id)) : OFFICE_PARTS;
  const wanted = [...new Set(chosen.flatMap((p) => p.parts))];

  const picked: Exercise[] = [];
  let used = 0;
  const fits = (e: Exercise) => !picked.includes(e) && used + officeSeconds(e) <= target + 20;
  const add = (e: Exercise) => {
    picked.push(e);
    used += officeSeconds(e);
  };
  // 新手動作優先，同等級內隨機（同一個種子結果固定）
  const rank = (list: Exercise[]) =>
    list.map((e) => ({ e, r: rand() + (e.difficulty === '新手' ? 0 : 0.6) })).sort((a, b) => a.r - b.r).map((x) => x.e);

  // 1. 每個選的部位輪流挑一個，確保每個部位都有照顧到
  const byPart = wanted.map((part) => rank(usable.filter((e) => e.bodyParts.includes(part))));
  let progress = true;
  while (progress) {
    progress = false;
    for (const list of byPart) {
      const e = list.find(fits);
      if (e) {
        add(e);
        progress = true;
      }
    }
  }
  // 2. 時間還很多：往相鄰部位補
  let widened = false;
  if (used < target * 0.75) {
    const near = [...new Set(wanted.flatMap((p) => NEAR[p] ?? []))].filter((p) => !wanted.includes(p));
    for (const e of rank(usable.filter((x) => x.bodyParts.some((b) => near.includes(b))))) {
      if (used >= target * 0.9) break;
      if (fits(e)) {
        add(e);
        widened = true;
      }
    }
  }
  // 3. 還是不夠（例如 15 分鐘只選頸）：其他動作也可以
  if (used < target * 0.75) {
    for (const e of rank(usable)) {
      if (used >= target * 0.9) break;
      if (fits(e)) {
        add(e);
        widened = true;
      }
    }
  }
  // 至少一個動作
  if (!picked.length && usable.length) add(rank(usable)[0]);

  const order = (e: Exercise) => Math.min(...e.bodyParts.map((b) => (FLOW.indexOf(b) + 1) || 99));
  // 站姿動作放最後，避免站起來又坐下
  const standing = (e: Exercise) => (/站/.test(e.name) || e.equipment === '牆面/門框' ? 1 : 0);
  picked.sort((a, b) => standing(a) - standing(b) || order(a) - order(b));

  const steps = picked.flatMap(officeSteps);
  const label = o.parts.length ? chosen.map((p) => p.label).join('・') : '全身放鬆';
  return {
    title: `辦公室小運動｜${label} ${o.minutes} 分鐘`,
    exercises: picked,
    steps,
    seconds: steps.reduce((s, x) => s + x.sec, 0) + Math.max(0, steps.length - 1) * OFFICE_REST_SEC,
    widened,
  };
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
