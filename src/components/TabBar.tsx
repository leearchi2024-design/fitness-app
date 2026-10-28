import type { ReactNode } from 'react';
import type { Route } from '../router';
import { IconCalendar, IconFood, IconMe, IconToday, IconTrain } from './Icons';

// 底部導覽列（5 個分頁）：今日、跟練、日曆、飲食、我的
const TABS: { key: Route['name']; href: string; label: string; icon: ReactNode; match: Route['name'][] }[] = [
  { key: 'today', href: '#/today', label: '今日', icon: <IconToday />, match: ['today'] },
  { key: 'train', href: '#/train', label: '跟練', icon: <IconTrain />, match: ['train', 'exercise'] },
  { key: 'calendar', href: '#/calendar', label: '日曆', icon: <IconCalendar />, match: ['calendar'] },
  { key: 'food', href: '#/food', label: '飲食', icon: <IconFood />, match: ['food'] },
  { key: 'me', href: '#/me', label: '我的', icon: <IconMe />, match: ['me', 'care', 'careDetail'] },
];

export function TabBar({ route }: { route: Route }) {
  return (
    <div className="tabbar">
      <nav aria-label="主要分頁">
        {TABS.map((t) => (
          <a key={t.key} href={t.href} aria-current={t.match.includes(route.name) ? 'page' : undefined}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
