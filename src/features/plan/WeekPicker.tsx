// ===== 一週課表：自己點選要練的星期幾，也可以依天數自動安排 =====
import { scheduleNote, WEEK_SCHEDULE } from '../../lib/workout';

export const WEEKDAYS_MON0 = ['一', '二', '三', '四', '五', '六', '日'];

export function WeekPicker({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const toggle = (d: number) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));
  const note = scheduleNote(days);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="week-picker" role="group" aria-label="選擇訓練日">
        {WEEKDAYS_MON0.map((label, i) => (
          <button key={label} className="week-day" aria-pressed={days.includes(i)} aria-label={`週${label}${days.includes(i) ? '練' : '休'}`} onClick={() => toggle(i)}>
            <span>{label}</span>
            <small>{days.includes(i) ? '練' : '休'}</small>
          </button>
        ))}
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="muted" style={{ fontSize: 13 }}>快速安排：</span>
        {[2, 3, 4, 5].map((n) => (
          <button key={n} className="chip sm" aria-pressed={same(days, WEEK_SCHEDULE[n])} onClick={() => onChange(WEEK_SCHEDULE[n])}>
            每週 {n} 天
          </button>
        ))}
      </div>
      <p className={note && days.length ? 'muted' : note ? 'warn-text' : 'muted'} style={{ fontSize: 13 }}>
        {note ?? `每週 ${days.length} 天：週${days.map((d) => WEEKDAYS_MON0[d]).join('、')}`}
      </p>
    </div>
  );
}

function same(a: number[], b: number[] = []) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
