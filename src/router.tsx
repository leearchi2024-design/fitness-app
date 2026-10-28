// ===== 極簡 Hash 路由 =====
// 使用 #/today 這種網址：放在 GitHub Pages 上重新整理也不會 404，也不需要額外套件。
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'train' }
  | { name: 'exercise'; id: string }
  | { name: 'session' }
  | { name: 'calendar'; date?: string }
  | { name: 'food' }
  | { name: 'me' }
  | { name: 'care' }
  | { name: 'careDetail'; id: string };

export function parseHash(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  switch (a) {
    case 'train': return { name: 'train' };
    case 'exercise': return b ? { name: 'exercise', id: b } : { name: 'train' };
    case 'session': return { name: 'session' };
    case 'calendar': return { name: 'calendar', date: b };
    case 'food': return { name: 'food' };
    case 'me': return { name: 'me' };
    case 'care': return b ? { name: 'careDetail', id: b } : { name: 'care' };
    default: return { name: 'today' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string) {
  window.location.hash = path;
}
