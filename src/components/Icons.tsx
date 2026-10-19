// 粗線條圖示，呼應編輯插畫風格
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconToday = () => (
  <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>
);
export const IconTrain = () => (
  <svg viewBox="0 0 24 24" {...P}><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></svg>
);
export const IconCalendar = () => (
  <svg viewBox="0 0 24 24" {...P}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconFood = () => (
  <svg viewBox="0 0 24 24" {...P}><path d="M4 12h16a8 8 0 0 1-16 0Z" /><path d="M9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4" /></svg>
);
export const IconMe = () => (
  <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" /></svg>
);
export const IconBack = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...P}><path d="M15 5l-7 7 7 7" /></svg>
);
