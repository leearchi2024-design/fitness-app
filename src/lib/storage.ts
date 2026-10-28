// ===== 資料儲存層 =====
// MVP 先存在使用者裝置（localStorage），不需要伺服器。
// 之後要做登入與雲端同步時，只要另外實作 DataStore（例如 Supabase / Firebase），
// 在 store/AppStore.tsx 換掉 localStore 即可，畫面元件不用改。
import type { AppData } from '../types';

export interface DataStore {
  load(): AppData;
  save(data: AppData): void;
  clear(): void;
}

const KEY = 'fitness-app/v1';

export const emptyData = (): AppData => ({
  profile: null,
  foods: [],
  workouts: [],
  bodyLogs: [],
  days: {},
  planEdits: {},
  settings: { addBackExerciseKcal: true },
});

export const localStore: DataStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyData();
      const base = emptyData();
      const d = JSON.parse(raw);
      return { ...base, ...d, settings: { ...base.settings, ...(d.settings ?? {}) } };
    } catch {
      return emptyData();
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* 私密瀏覽或空間不足時略過 */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
