// 食物插畫：配方字串（Notion「插畫配方」）→ SVG，畫法見 lib/foodArt.ts
import { memo, useMemo } from 'react';
import { foodArtSvg } from '../lib/foodArt';

export const FoodArt = memo(function FoodArt({ art, size = 56, label }: { art?: string; size?: number; label?: string }) {
  const html = useMemo(() => (art ? foodArtSvg(art, size, label) : ''), [art, size, label]);
  return (
    <span
      className="food-art"
      style={{ width: size, height: size }}
      {...(art ? { dangerouslySetInnerHTML: { __html: html } } : {})}
    />
  );
});
