// ===== 飲食照片／貼紙儲存（IndexedDB） =====
// 照片比文字大很多，不放 localStorage，改存在瀏覽器的 IndexedDB。
// 瀏覽器不支援或被封鎖時（私密瀏覽等），改存在記憶體：本次使用期間看得到，關掉後消失。
import { useEffect, useState } from 'react';

const DB_NAME = 'fitness-app-photos';
const STORE = 'stickers';
const memory = new Map<string, Blob>();
const urlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
const db = () => (dbPromise ??= openDb());

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(undefined);
        try {
          const req = fn(d.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  memory.set(id, blob);
  await tx('readwrite', (s) => s.put(blob, id));
}

export async function deletePhoto(id: string): Promise<void> {
  memory.delete(id);
  const url = urlCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(id);
  await tx('readwrite', (s) => s.delete(id));
}

/** 清除所有貼紙（「我的 → 清除資料」時使用） */
export async function clearPhotos(): Promise<void> {
  memory.clear();
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
  await tx('readwrite', (s) => s.clear());
}

export async function getPhotoUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = memory.get(id) ?? ((await tx<Blob>('readonly', (s) => s.get(id) as IDBRequest<Blob>)) ?? null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

/** 取得貼紙圖片網址；undefined = 讀取中，null = 找不到 */
export function usePhoto(id?: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(() => (id ? urlCache.get(id) : null));
  useEffect(() => {
    let alive = true;
    if (!id) return setUrl(null);
    getPhotoUrl(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

// ===== 照片 → 圓形貼紙 =====

export interface StickerGeometry {
  /** 來源圖片要裁切的正方形範圍（置中、取短邊） */
  sx: number; sy: number; side: number;
}

/** 計算置中裁成正方形的範圍（純函式，可測試） */
export function centerSquare(width: number, height: number): StickerGeometry {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

const SIZE = 320; // 輸出貼紙尺寸（px）
const BORDER = 14; // 白邊
const OUTLINE = 4; // 黑色外框

/** 把照片做成「白邊＋黑框」的圓形貼紙，回傳 PNG／WebP Blob */
export async function makeSticker(file: Blob): Promise<Blob> {
  const img = await loadImage(file);
  const { sx, sy, side } = centerSquare(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const c = SIZE / 2;
  const r = c - OUTLINE - 6; // 留一點空間給陰影

  // 錯位網點陰影（呼應畫風 01 的套色不準效果）
  ctx.save();
  ctx.beginPath();
  ctx.arc(c + 5, c + 5, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#9a9a9a';
  for (let y = 0; y < SIZE; y += 7) for (let x = 0; x < SIZE; x += 7) ctx.fillRect(x, y, 2.6, 2.6);
  ctx.restore();

  // 黑框 + 白邊
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, r - OUTLINE, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf8';
  ctx.fill();

  // 照片
  const inner = r - OUTLINE - BORDER;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, inner, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, sx, sy, side, side, c - inner, c - inner, inner * 2, inner * 2);
  ctx.restore();

  if ('close' in img) (img as ImageBitmap).close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('無法產生貼紙'))), 'image/webp', 0.86);
  });
}

async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* 改用 <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
