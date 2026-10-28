// ===== 備份與還原 =====
// 資料只存在使用者自己的瀏覽器（Safari／Chrome）。備份檔把所有紀錄與飲食貼紙打包成一個 .json，
// 換手機、換瀏覽器或清除瀏覽器資料前，可以先備份，之後再還原。
import type { AppData } from '../types';
import { emptyData } from './storage';

export const BACKUP_APP = 'lianqilai-fitness';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: AppData;
  /** 飲食貼紙：photoId → data URL */
  photos: Record<string, string>;
}

/** 建立備份內容（純函式，照片由呼叫端先轉成 data URL） */
export function buildBackup(data: AppData, photos: Record<string, string>, now = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data, photos };
}

export class BackupError extends Error {}

/** 解析並檢查備份檔；格式不對時丟出看得懂的錯誤 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('這個檔案不是練起來的備份檔。');
  }
  const b = raw as Partial<BackupFile>;
  if (!b || b.app !== BACKUP_APP || typeof b.version !== 'number' || !b.data) {
    throw new BackupError('這個檔案不是練起來的備份檔。');
  }
  if (b.version > BACKUP_VERSION) {
    throw new BackupError('這個備份來自較新的版本，請先更新 APP（重新整理網頁）再還原。');
  }
  const base = emptyData();
  const d = b.data as Partial<AppData>;
  const data: AppData = {
    profile: d.profile ?? null,
    foods: Array.isArray(d.foods) ? d.foods : [],
    workouts: Array.isArray(d.workouts) ? d.workouts : [],
    bodyLogs: Array.isArray(d.bodyLogs) ? d.bodyLogs : [],
    days: d.days && typeof d.days === 'object' ? d.days : {},
    planEdits: d.planEdits && typeof d.planEdits === 'object' ? d.planEdits : {},
    settings: { ...base.settings, ...(d.settings ?? {}) },
  };
  const photos: Record<string, string> = {};
  for (const [id, url] of Object.entries(b.photos ?? {})) {
    if (typeof url === 'string' && url.startsWith('data:image/')) photos[id] = url;
  }
  return { app: BACKUP_APP, version: b.version, exportedAt: String(b.exportedAt ?? ''), data, photos };
}

/** 備份內容摘要（還原前給使用者確認） */
export function describeBackup(b: BackupFile): string {
  const d = new Date(b.exportedAt);
  const when = isNaN(d.getTime()) ? '' : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} 備份・`;
  return `${when}運動 ${b.data.workouts.length} 次、飲食 ${b.data.foods.length} 筆、身體紀錄 ${b.data.bodyLogs.length} 筆、貼紙 ${Object.keys(b.photos).length} 張`;
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  // 用英數檔名：部分瀏覽器會把中文檔名改成「download」
  return `lianqilai-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.json`;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

/** 請瀏覽器把這個網站的資料標成「不要自動清除」（Safari／Chrome 可能會詢問或自動決定） */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
