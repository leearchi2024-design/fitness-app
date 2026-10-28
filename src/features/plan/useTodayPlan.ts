import { useMemo } from 'react';
import { fromKey, toKey } from '../../lib/date';
import { applyPlanEdit, type BlockView } from '../../lib/planEdit';
import { buildWorkoutPlan, isTrainingDay, optionsFromProfile, type PlanOptions, type WorkoutPlan } from '../../lib/workout';
import { useStore } from '../../store/AppStore';

export interface DayPlan {
  plan: WorkoutPlan | null;
  /** 原始推薦（沒套用調整） */
  base: WorkoutPlan | null;
  blocks: BlockView[];
  training: boolean;
  edited: boolean;
  /** 這天標記了生理期 → 自動換成經期友善動作 */
  periodMode: boolean;
  opts: PlanOptions | null;
}

/** 取得某天的跟練菜單（以日期為種子，同一天內容固定），並套用使用者的調整 */
export function usePlanFor(date: string = toKey()): DayPlan {
  const { data } = useStore();
  const edit = data.planEdits?.[date];
  const periodMode = !!data.days[date]?.period && data.profile?.gender === 'female';
  return useMemo(() => {
    const p = data.profile;
    if (!p) return { plan: null, base: null, blocks: [], training: false, edited: false, periodMode, opts: null };
    const opts = { ...optionsFromProfile(p, date), periodMode };
    const base = buildWorkoutPlan(opts, p.body.weightKg);
    const { plan, blocks } = applyPlanEdit(base, edit);
    return {
      plan,
      base,
      blocks,
      training: isTrainingDay(p.daysPerWeek, fromKey(date)),
      edited: !!edit && (edit.removed.length > 0 || edit.added.length > 0),
      periodMode,
      opts,
    };
  }, [data.profile, date, edit, periodMode]);
}
