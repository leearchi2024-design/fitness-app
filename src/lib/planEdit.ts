// ===== 跟練菜單調整：移除不喜歡的動作、建議替換、從動作庫加入 =====
import { EXERCISES } from '../data/exercises';
import type { Exercise, PlanEdit } from '../types';
import { filterExercises, type PlanBlock, type PlanOptions, type WorkoutPlan } from './workout';

export const EMPTY_EDIT: PlanEdit = { removed: [], added: [] };

export type SlotView =
  | { kind: 'exercise'; e: Exercise; origin: 'plan' | 'added' | 'replaced'; replaces?: Exercise }
  | { kind: 'removed'; e: Exercise };

export interface BlockView {
  label: PlanBlock['label'];
  minutes: number;
  slots: SlotView[];
}

const byId = new Map(EXERCISES.map((e) => [e.id, e]));
export const exerciseById = (id: string) => byId.get(id);

/** 套用使用者的調整，回傳實際要跟練的菜單 + 給畫面用的格子 */
export function applyPlanEdit(plan: WorkoutPlan, edit: PlanEdit = EMPTY_EDIT): { plan: WorkoutPlan; blocks: BlockView[] } {
  const removed = new Set(edit.removed);
  const replace = edit.replace ?? {};
  const blocks: BlockView[] = plan.blocks.map((b) => ({
    label: b.label,
    minutes: b.minutes,
    slots: b.exercises.map((e): SlotView => {
      if (!removed.has(e.id)) return { kind: 'exercise', e, origin: 'plan' };
      const r = replace[e.id] && byId.get(replace[e.id]);
      return r ? { kind: 'exercise', e: r, origin: 'replaced', replaces: e } : { kind: 'removed', e };
    }),
  }));
  const main = blocks.find((b) => b.label === '主訓練') ?? blocks[0];
  const inPlan = new Set(blocks.flatMap((b) => b.slots.filter((s) => s.kind === 'exercise').map((s) => s.e.id)));
  for (const id of edit.added) {
    const e = byId.get(id);
    if (e && !inPlan.has(id)) {
      main.slots.push({ kind: 'exercise', e, origin: 'added' });
      inPlan.add(id);
    }
  }
  const edited: WorkoutPlan = {
    ...plan,
    blocks: blocks.map((b) => ({
      label: b.label,
      minutes: b.minutes,
      exercises: b.slots.filter((s): s is Extract<SlotView, { kind: 'exercise' }> => s.kind === 'exercise').map((s) => s.e),
    })),
  };
  // 動作數量改變時，熱量依主訓練動作數粗略調整
  const before = plan.blocks.reduce((n, b) => n + b.exercises.length, 0);
  const after = edited.blocks.reduce((n, b) => n + b.exercises.length, 0);
  if (before && after !== before) edited.kcal = Math.max(0, Math.round((plan.kcal * after) / before));
  return { plan: edited, blocks };
}

/** 移除某動作後的建議替換：同類型、同部位優先，排除已在菜單內的 */
export function suggestReplacements(
  removed: Exercise,
  block: PlanBlock['label'],
  exclude: string[],
  opts: Omit<PlanOptions, 'minutes' | 'seed'>,
  n = 3,
): Exercise[] {
  const skip = new Set([...exclude, removed.id]);
  let pool: Exercise[];
  if (block === '熱身') pool = EXERCISES.filter((e) => e.tags.includes('熱身') && !e.jumping);
  else if (block === '收操') pool = EXERCISES.filter((e) => e.source === 'yoga' && e.difficulty === '新手');
  else {
    // 先找符合個人設定的動作；不夠時放寬到其他類型、高一級難度（器材仍以使用者有的為準）
    pool = filterExercises(opts);
    if (pool.filter((e) => !skip.has(e.id)).length < n) {
      const wider = filterExercises({ ...opts, types: ['strength', 'yoga', 'cardio'], level: opts.level === 'beginner' ? 'occasional' : 'regular' })
        .filter((e) => opts.level !== 'beginner' || !e.jumping);
      pool = [...pool, ...wider.filter((e) => !pool.includes(e))];
    }
  }
  if (opts.periodMode) pool = pool.filter((e) => e.periodFriendly);
  pool = pool.filter((e) => !skip.has(e.id));
  const overlap = (e: Exercise) => e.bodyParts.filter((b) => removed.bodyParts.includes(b)).length;
  const score = (e: Exercise) => (e.source === removed.source ? 10 : 0) + overlap(e) * 3 + (e.difficulty === removed.difficulty ? 1 : 0);
  return [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id)).slice(0, n);
}

/** 動作 id 清單操作（不重複） */
export const withId = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);
export const withoutId = (list: string[], id: string) => list.filter((x) => x !== id);
