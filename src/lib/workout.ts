// ===== 模組 5-3：菜單推薦 =====
// 結構：熱身 → 主訓練 → 收操。依目標部位、運動類型、程度、器材、時間篩選。
import { EXERCISES } from '../data/exercises';
import type { Difficulty, Equipment, Exercise, GoalId, Level, UserProfile, WorkoutType } from '../types';

const GOAL_PARTS: Partial<Record<GoalId, string[]>> = {
  legs_glutes: ['腿', '臀'], glute_lift: ['臀', '腿'],
  arms: ['手臂'], arm_tone: ['手臂'], biceps: ['手臂'],
  back_posture: ['背', '肩', '肩頸'], shoulders: ['肩'],
  chest: ['胸'], pecs: ['胸'],
  core: ['核心'], abs_line: ['核心'], six_pack: ['核心'],
  postpartum: ['核心', '臀'],
};

const LEVEL_DIFFICULTY: Record<Level, Difficulty[]> = {
  beginner: ['新手'],
  occasional: ['新手', '中階'],
  regular: ['新手', '中階', '進階'],
};

const EQUIPMENT_MAP: Record<Equipment, string[]> = {
  none: ['徒手'], mat: ['徒手', '瑜珈墊'], dumbbell: ['啞鈴'], band: ['彈力帶'], gym: ['壺鈴', '槓鈴', '器械'],
};

/** 運動類型 → 動作來源；皮拉提斯與伸展暫用瑜珈動作，HIIT 用有氧動作 */
const TYPE_SOURCE: Record<WorkoutType, Exercise['source']> = {
  strength: 'strength', yoga: 'yoga', pilates: 'yoga', stretch: 'yoga', cardio: 'cardio', hiit: 'cardio',
};

/** 每個動作約佔的分鐘數（含組間休息） */
const MINUTES_PER: Record<Exercise['source'], number> = { strength: 4, yoga: 1.5, cardio: 1, office: 1 };
/** 估算消耗用的 MET 值 */
const MET: Record<Exercise['source'], number> = { strength: 5, yoga: 2.5, cardio: 7, office: 2.3 };

export interface PlanBlock {
  label: '熱身' | '主訓練' | '收操';
  minutes: number;
  exercises: Exercise[];
}
export interface WorkoutPlan {
  title: string;
  minutes: number;
  kcal: number;
  blocks: PlanBlock[];
}

export interface PlanOptions {
  minutes: number;
  types: WorkoutType[];
  parts: string[];
  level: Level;
  equipment: Equipment[];
  periodMode?: boolean;
  seed?: string;
}

/** 一週課表：回傳要訓練的星期（0=週一 … 6=週日），平均分散並保留休息日 */
export const WEEK_SCHEDULE: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

/** 這個人的訓練日（0＝週一）：自己安排的優先，否則依每週天數自動安排 */
export function trainingWeekdays(p: Pick<UserProfile, 'daysPerWeek' | 'trainingDays'>): number[] {
  if (p.trainingDays?.length) return [...new Set(p.trainingDays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  return WEEK_SCHEDULE[p.daysPerWeek] ?? WEEK_SCHEDULE[3];
}

export function isTrainingDay(days: number[], date: Date): boolean {
  return days.includes((date.getDay() + 6) % 7);
}

/** 課表提醒：連續練太多天、完全沒休息 */
export function scheduleNote(days: number[]): string | null {
  if (!days.length) return '至少選一天。';
  if (days.length === 7) return '一週 7 天都練，建議至少留 1 天休息，讓肌肉恢復。';
  const set = new Set(days);
  let run = 0, maxRun = 0;
  for (let i = 0; i < 14; i++) {
    run = set.has(i % 7) ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun >= 4) return `連續練 ${maxRun} 天，記得安排輕鬆的伸展或瑜珈日。`;
  return null;
}

export function targetParts(goals: GoalId[]): string[] {
  const parts = goals.flatMap((g) => GOAL_PARTS[g] ?? []);
  return parts.length ? [...new Set(parts)] : ['全身'];
}

export function optionsFromProfile(p: UserProfile, seed: string): PlanOptions {
  return {
    minutes: p.minutesPerSession,
    types: p.workoutTypes,
    parts: targetParts(p.goals),
    level: p.level,
    equipment: p.equipment,
    seed,
  };
}

export function filterExercises(opts: Omit<PlanOptions, 'minutes' | 'seed'>): Exercise[] {
  const sources = new Set(opts.types.map((t) => TYPE_SOURCE[t]));
  const diffs = LEVEL_DIFFICULTY[opts.level];
  const equip = new Set(['徒手', '瑜珈墊', ...opts.equipment.flatMap((e) => EQUIPMENT_MAP[e])]);
  return EXERCISES.filter(
    (e) =>
      sources.has(e.source) &&
      diffs.includes(e.difficulty) &&
      equip.has(e.equipment) &&
      (!opts.periodMode || e.periodFriendly) &&
      // 新手不排跳躍動作
      (opts.level !== 'beginner' || !e.jumping),
  );
}

export function buildWorkoutPlan(opts: PlanOptions, weightKg = 60): WorkoutPlan {
  const rand = seededRandom(opts.seed ?? 'default');
  const total = opts.minutes;
  const warmMin = total <= 15 ? 3 : 6;
  const coolMin = total <= 15 ? 2 : 6;
  const mainMin = total - warmMin - coolMin;

  const pool = filterExercises(opts);
  const matchesPart = (e: Exercise) => e.bodyParts.some((b) => opts.parts.includes(b) || b === '全身');
  const main = shuffle(pool.filter(matchesPart), rand);
  const fallback = shuffle(pool.filter((e) => !matchesPart(e)), rand);

  const picked: Exercise[] = [];
  let used = 0;
  for (const e of [...main, ...fallback]) {
    if (used + MINUTES_PER[e.source] > mainMin) continue;
    picked.push(e);
    used += MINUTES_PER[e.source];
  }

  const warm = pickByTag(['熱身'], warmMin, rand, opts);
  const cool = pickCooldown(coolMin, rand, opts);

  const blocks: PlanBlock[] = [
    { label: '熱身', minutes: warmMin, exercises: warm },
    { label: '主訓練', minutes: mainMin, exercises: picked },
    { label: '收操', minutes: coolMin, exercises: cool },
  ];

  const kcal = Math.round(
    blocks.reduce((sum, b) => {
      const met = b.label === '主訓練' && picked.length ? avg(picked.map((e) => MET[e.source])) : 3;
      return sum + met * weightKg * (b.minutes / 60);
    }, 0),
  );

  return { title: `${opts.parts.slice(0, 2).join('・')}｜${total} 分鐘`, minutes: total, kcal, blocks };
}

/** 「換一個」：同部位、同來源中換成另一個動作 */
export function swapExercise(current: Exercise, exclude: string[], opts: PlanOptions): Exercise | null {
  const candidates = filterExercises(opts).filter(
    (e) => e.source === current.source && !exclude.includes(e.id) && e.bodyParts.some((b) => current.bodyParts.includes(b)),
  );
  return candidates[0] ?? null;
}

function pickByTag(tags: string[], minutes: number, rand: () => number, opts: PlanOptions): Exercise[] {
  const list = EXERCISES.filter(
    (e) => e.tags.some((t) => tags.includes(t)) && !e.jumping && (!opts.periodMode || e.periodFriendly),
  );
  return shuffle(list, rand).slice(0, Math.max(1, Math.round(minutes / 1.5)));
}

function pickCooldown(minutes: number, rand: () => number, opts: PlanOptions): Exercise[] {
  const yogaRelax = EXERCISES.filter((e) => e.source === 'yoga' && e.difficulty === '新手' && e.periodFriendly);
  const n = Math.max(1, Math.round(minutes / 2));
  const list = shuffle(yogaRelax, rand).slice(0, n);
  if (!opts.periodMode && list.length < n) list.push(...pickByTag(['收操'], 2, rand, opts));
  return list;
}

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 以日期等字串當種子，同一天看到的菜單會一致 */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
