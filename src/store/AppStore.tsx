// ===== 全域狀態：使用者資料 + 紀錄 =====
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildPlanSummary, type PlanSummary } from '../lib/calc';
import { toKey, uid } from '../lib/date';
import { requestPersistentStorage } from '../lib/backup';
import { clearPhotos, deletePhoto } from '../lib/photoStore';
import { emptyData, localStore } from '../lib/storage';
import type { AppData, BodyLog, FoodEntry, UserProfile, WorkoutLog } from '../types';

interface Store {
  data: AppData;
  summary: PlanSummary | null;
  setProfile(p: UserProfile): void;
  addFood(f: Omit<FoodEntry, 'id'>): void;
  removeFood(id: string): void;
  updateFood(id: string, patch: Partial<Omit<FoodEntry, 'id'>>): void;
  addWorkout(w: Omit<WorkoutLog, 'id'>): void;
  saveBodyLog(b: BodyLog): void;
  addWater(ml: number, date?: string): void;
  setAddBack(v: boolean): void;
  reset(): void;
  /** 從備份還原：整份取代目前資料 */
  replaceAll(data: AppData): void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => localStore.load());

  useEffect(() => localStore.save(data), [data]);

  const summary = useMemo(() => (data.profile ? buildPlanSummary(data.profile) : null), [data.profile]);

  const setProfile = useCallback((profile: UserProfile) => {
    setData((d) => ({ ...d, profile }));
    requestPersistentStorage();
  }, []);
  const addFood = useCallback(
    (f: Omit<FoodEntry, 'id'>) => setData((d) => ({ ...d, foods: [...d.foods, { ...f, id: uid() }] })),
    [],
  );
  const removeFood = useCallback(
    (id: string) =>
      setData((d) => {
        const photoId = d.foods.find((f) => f.id === id)?.photoId;
        if (photoId) deletePhoto(photoId);
        return { ...d, foods: d.foods.filter((f) => f.id !== id) };
      }),
    [],
  );
  const updateFood = useCallback(
    (id: string, patch: Partial<Omit<FoodEntry, 'id'>>) =>
      setData((d) => ({ ...d, foods: d.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
    [],
  );
  const addWorkout = useCallback(
    (w: Omit<WorkoutLog, 'id'>) => setData((d) => ({ ...d, workouts: [...d.workouts, { ...w, id: uid() }] })),
    [],
  );
  const saveBodyLog = useCallback(
    (b: BodyLog) =>
      setData((d) => ({
        ...d,
        bodyLogs: [...d.bodyLogs.filter((x) => x.date !== b.date), b].sort((a, c) => a.date.localeCompare(c.date)),
        profile: d.profile && b.weightKg ? { ...d.profile, body: { ...d.profile.body, weightKg: b.weightKg } } : d.profile,
      })),
    [],
  );
  const addWater = useCallback(
    (ml: number, date = toKey()) =>
      setData((d) => ({
        ...d,
        days: { ...d.days, [date]: { waterMl: Math.max(0, (d.days[date]?.waterMl ?? 0) + ml) } },
      })),
    [],
  );
  const setAddBack = useCallback(
    (v: boolean) => setData((d) => ({ ...d, settings: { ...d.settings, addBackExerciseKcal: v } })),
    [],
  );
  const reset = useCallback(() => {
    localStore.clear();
    clearPhotos();
    setData(emptyData());
  }, []);

  const replaceAll = useCallback((next: AppData) => setData(next), []);

  const value = useMemo(
    () => ({ data, summary, setProfile, addFood, removeFood, updateFood, addWorkout, saveBodyLog, addWater, setAddBack, reset, replaceAll }),
    [data, summary, setProfile, addFood, removeFood, updateFood, addWorkout, saveBodyLog, addWater, setAddBack, reset, replaceAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore 必須在 AppStoreProvider 內使用');
  return s;
}

/** 某一天的彙整：攝取、運動消耗、喝水 */
export function useDay(date: string) {
  const { data } = useStore();
  return useMemo(() => {
    const foods = data.foods.filter((f) => f.date === date);
    const workouts = data.workouts.filter((w) => w.date === date);
    return {
      foods,
      workouts,
      eaten: foods.reduce((s, f) => s + f.kcal, 0),
      protein: foods.reduce((s, f) => s + (f.proteinG ?? 0), 0),
      burned: workouts.reduce((s, w) => s + w.kcal, 0),
      waterMl: data.days[date]?.waterMl ?? 0,
      body: data.bodyLogs.find((b) => b.date === date),
    };
  }, [data, date]);
}
