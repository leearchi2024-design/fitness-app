import { useMemo } from 'react';
import { fromKey, toKey } from '../../lib/date';
import { buildWorkoutPlan, isTrainingDay, optionsFromProfile, type WorkoutPlan } from '../../lib/workout';
import { useStore } from '../../store/AppStore';

/** 取得某天的跟練菜單（以日期為種子，同一天內容固定） */
export function usePlanFor(date: string = toKey()): { plan: WorkoutPlan | null; training: boolean } {
  const { data } = useStore();
  return useMemo(() => {
    const p = data.profile;
    if (!p) return { plan: null, training: false };
    return {
      plan: buildWorkoutPlan(optionsFromProfile(p, date), p.body.weightKg),
      training: isTrainingDay(p.daysPerWeek, fromKey(date)),
    };
  }, [data.profile, date]);
}
