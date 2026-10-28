import { describe, expect, it } from 'vitest';
import { applyPlanEdit, suggestReplacements } from './planEdit';
import { buildWorkoutPlan, targetParts, type PlanOptions } from './workout';
import { EXERCISES } from '../data/exercises';

const opts: PlanOptions = {
  minutes: 30, types: ['strength', 'yoga'], parts: targetParts(['legs_glutes']), level: 'beginner', equipment: ['dumbbell'], seed: '2026-10-28',
};
const base = buildWorkoutPlan(opts, 60);
const main = base.blocks[1].exercises;

describe('菜單調整', () => {
  it('移除的動作不會出現在跟練中，畫面上留下「已移除」格子', () => {
    const target = main[0];
    const { plan, blocks } = applyPlanEdit(base, { removed: [target.id], added: [] });
    expect(plan.blocks[1].exercises.map((e) => e.id)).not.toContain(target.id);
    expect(blocks[1].slots[0]).toEqual({ kind: 'removed', e: target });
  });

  it('替換的動作放在原本的位置', () => {
    const target = main[0];
    const other = EXERCISES.find((e) => !base.blocks.some((b) => b.exercises.includes(e)))!;
    const { plan, blocks } = applyPlanEdit(base, { removed: [target.id], added: [], replace: { [target.id]: other.id } });
    expect(plan.blocks[1].exercises[0].id).toBe(other.id);
    expect(blocks[1].slots[0]).toMatchObject({ kind: 'exercise', origin: 'replaced', replaces: target });
  });

  it('從動作庫加入的動作排在主訓練最後，不重複', () => {
    const other = EXERCISES.find((e) => !base.blocks.some((b) => b.exercises.includes(e)))!;
    const { plan } = applyPlanEdit(base, { removed: [], added: [other.id, other.id] });
    expect(plan.blocks[1].exercises.at(-1)!.id).toBe(other.id);
    expect(plan.blocks[1].exercises.filter((e) => e.id === other.id)).toHaveLength(1);
  });

  it('建議替換：同類型優先、不含已在菜單的動作', () => {
    const target = main[0];
    const inPlan = base.blocks.flatMap((b) => b.exercises.map((e) => e.id));
    const list = suggestReplacements(target, '主訓練', inPlan, opts);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((e) => inPlan.includes(e.id))).toBe(false);
    expect(list[0].source).toBe(target.source);
  });

  it('動作很少時（新手、經期）仍有建議可換', () => {
    const narrow: PlanOptions = { minutes: 30, types: ['strength'], parts: ['腿'], level: 'beginner', equipment: ['none'], periodMode: true, seed: 'x' };
    const p = buildWorkoutPlan(narrow, 55);
    const target = p.blocks[1].exercises[0];
    const list = suggestReplacements(target, '主訓練', p.blocks.flatMap((b) => b.exercises.map((e) => e.id)), narrow);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((e) => e.periodFriendly && !e.jumping)).toBe(true);
  });
});
