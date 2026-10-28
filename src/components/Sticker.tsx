// 飲食貼紙：從 IndexedDB 讀取圓形貼紙圖片
import { usePhoto } from '../lib/photoStore';

/** 依 id 產生固定的小角度，讓貼紙看起來像手貼上去的 */
export function tilt(id: string, max = 8): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % (max * 2 + 1)) - max;
}

export function Sticker({ photoId, size = 64, label, rotate = true }: { photoId: string; size?: number; label?: string; rotate?: boolean }) {
  const url = usePhoto(photoId);
  const style = { width: size, height: size, transform: rotate ? `rotate(${tilt(photoId)}deg)` : undefined };
  if (!url) return <span className="sticker sticker-empty" style={style} aria-label={label ?? '飲食貼紙'} />;
  return <img className="sticker" src={url} alt={label ?? '飲食貼紙'} style={style} />;
}
