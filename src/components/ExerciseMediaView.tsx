// 示範影片／動畫顯示：支援 SVG 動畫、圖片、影片；檔案不存在時顯示網點佔位
import { useState } from 'react';
import type { Exercise } from '../types';

export function ExerciseMediaView({ exercise, variant = 'card' }: { exercise: Exercise; variant?: 'card' | 'session' }) {
  const [failed, setFailed] = useState(false);
  const m = exercise.media;
  const cls = `media media-${variant}`;

  if (!m || failed) {
    return (
      <div className={`${cls} media-empty halftone`} role="img" aria-label={`${exercise.name} 示範（尚未匯入）`}>
        <span className="tag">{m ? '示範檔尚未匯入' : '示範影片（待上傳）'}</span>
      </div>
    );
  }

  if (m.kind === 'video') {
    return (
      <div className={cls}>
        <video
          key={m.src}
          src={m.src}
          autoPlay
          loop
          muted
          playsInline
          controls={variant === 'card'}
          onError={() => setFailed(true)}
          aria-label={`${exercise.name} 示範影片`}
        />
      </div>
    );
  }

  // SVG（含 CSS／SMIL 動畫）與圖片都用 <img> 顯示，動畫會自動播放
  return (
    <div className={cls}>
      <img key={m.src} src={m.src} alt={`${exercise.name} 示範`} onError={() => setFailed(true)} />
    </div>
  );
}
