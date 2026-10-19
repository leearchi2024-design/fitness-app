// ===== 分頁「日曆」：月曆、每日紀錄、身體變化週報（模組三） =====
import { useMemo, useState } from 'react';
import { fromKey, monthGrid, toKey } from '../lib/date';
import { go } from '../router';
import { useDay, useStore } from '../store/AppStore';
import type { AppData, BodyLog, MealSlot } from '../types';

const MEALS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: '早餐' }, { id: 'lunch', label: '午餐' }, { id: 'dinner', label: '晚餐' }, { id: 'snack', label: '點心' },
];

export function Calendar({ date }: { date?: string }) {
  const { data } = useStore();
  const selected = date ?? toKey();
  const sel = fromKey(selected);
  const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);
  const marks = useMemo(() => dayMarks(data), [data]);
  const todayKey = toKey();

  const shift = (d: number) => setView(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));

  return (
    <div className="page">
      <header className="page-head"><h1>日曆</h1></header>

      <section className="card">
        <div className="between" style={{ marginBottom: 8 }}>
          <button className="btn sm" onClick={() => shift(-1)} aria-label="上個月">‹</button>
          <b className="num" style={{ fontSize: 18 }}>{view.y} / {String(view.m + 1).padStart(2, '0')}</b>
          <button className="btn sm" onClick={() => shift(1)} aria-label="下個月">›</button>
        </div>
        <div className="cal">
          {['一', '二', '三', '四', '五', '六', '日'].map((d) => <span key={d} className="dow">{d}</span>)}
          {cells.map((d) => {
            const k = toKey(d);
            const mk = marks[k];
            return (
              <button
                key={k}
                className={`${d.getMonth() !== view.m ? 'out' : ''} ${k === todayKey ? 'today' : ''}`}
                aria-pressed={k === selected}
                onClick={() => go(`/calendar/${k}`)}
              >
                {d.getDate()}
                <span className="marks">
                  {mk?.w && <i className="w" />}
                  {mk?.f && <i className="f" />}
                  {mk?.b && <i className="b" />}
                  {mk?.p && <i className="p" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          <span><i style={{ background: 'var(--accent)' }} />運動完成</span>
          <span><i style={{ background: 'var(--ok)' }} />飲食已記錄</span>
          <span><i style={{ background: 'var(--dot)' }} />量了體重</span>
          {data.profile?.body.cycle && <span><i style={{ background: '#d6336c' }} />生理期（預估）</span>}
        </div>
      </section>

      <DayDetail key={selected} date={selected} />
      <WeeklyReport />
    </div>
  );
}

function DayDetail({ date }: { date: string }) {
  const day = useDay(date);
  const { saveBodyLog } = useStore();
  const [form, setForm] = useState<BodyLog>(day.body ?? { date });
  const d = fromKey(date);

  return (
    <section className="card">
      <h2>{d.getMonth() + 1} 月 {d.getDate()} 日</h2>
      <div className="stack">
        <span className="eyebrow">運動</span>
        {day.workouts.length ? (
          day.workouts.map((w) => (
            <p key={w.id}><b>{w.title}</b> <span className="muted">・{w.minutes} 分・{w.kcal} 大卡</span></p>
          ))
        ) : <p className="muted">尚無紀錄</p>}

        <span className="eyebrow">飲食（{day.eaten} 大卡）</span>
        {MEALS.map((m) => {
          const items = day.foods.filter((f) => f.meal === m.id);
          return (
            <p key={m.id}><b>{m.label}</b> <span className="muted">{items.length ? items.map((f) => f.name).join('、') : '—'}</span></p>
          );
        })}

        <span className="eyebrow">身體</span>
        <div className="grid2">
          <Num label="體重（kg）" v={form.weightKg} on={(v) => setForm({ ...form, weightKg: v })} />
          <Num label="腰圍（cm）" v={form.girth?.waist} on={(v) => setForm({ ...form, girth: { ...form.girth, waist: v } })} />
        </div>
        <div className="field">
          <label htmlFor="note">一句話日記</label>
          <input id="note" className="input" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="今天的心情…" />
        </div>
        <button className="btn dark" onClick={() => saveBodyLog({ ...form, date })}>儲存身體紀錄</button>
      </div>
    </section>
  );
}

/** 模組 3-3：每週身體變化週報（近 7 天） */
function WeeklyReport() {
  const { data } = useStore();
  const stats = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return toKey(d);
    });
    const ws = data.workouts.filter((w) => days.includes(w.date));
    const foodDays = days.filter((k) => data.foods.some((f) => f.date === k));
    const kcal = data.foods.filter((f) => days.includes(f.date)).reduce((s, f) => s + f.kcal, 0);
    const weights = data.bodyLogs.filter((b) => b.weightKg).slice(-8);
    return {
      trainDays: new Set(ws.map((w) => w.date)).size,
      minutes: ws.reduce((s, w) => s + w.minutes, 0),
      avgKcal: foodDays.length ? Math.round(kcal / foodDays.length) : 0,
      weights,
    };
  }, [data]);

  return (
    <section className="card dots">
      <h2>本週週報</h2>
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><b>{stats.trainDays}</b><span>運動天數</span></div>
        <div className="stat"><b>{stats.minutes}</b><span>總分鐘</span></div>
        <div className="stat"><b>{stats.avgKcal}</b><span>平均攝取</span></div>
      </div>
      <div style={{ marginTop: 14 }}>
        <span className="eyebrow">體重變化</span>
        {stats.weights.length >= 2 ? <WeightLine logs={stats.weights} /> : <p className="muted">記錄兩次以上體重後，這裡會出現折線圖。</p>}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>體重沒降也沒關係，運動天數和圍度也是進步。</p>
    </section>
  );
}

function WeightLine({ logs }: { logs: BodyLog[] }) {
  const w = 300, h = 90, pad = 10;
  const vals = logs.map((l) => l.weightKg!);
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const pts = vals.map((v, i) => [pad + (i * (w - pad * 2)) / (vals.length - 1), h - pad - ((v - min) / (max - min)) * (h - pad * 2)]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="體重折線圖">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#111" strokeWidth="2.5" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#ff5a1f" stroke="#111" strokeWidth="2" />)}
      <text x={pts.at(-1)![0]} y={pts.at(-1)![1] - 8} textAnchor="end" fontSize="12" fontWeight="700">{vals.at(-1)} kg</text>
    </svg>
  );
}

function Num({ label, v, on }: { label: string; v?: number; on: (v: number | undefined) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input num" type="number" step="0.1" inputMode="decimal" value={v ?? ''}
        onChange={(e) => on(e.target.value === '' ? undefined : +e.target.value)} />
    </div>
  );
}

function dayMarks(data: AppData) {
  const m: Record<string, { w?: boolean; f?: boolean; b?: boolean; p?: boolean }> = {};
  const set = (k: string, key: 'w' | 'f' | 'b' | 'p') => ((m[k] ??= {})[key] = true);
  data.workouts.forEach((w) => set(w.date, 'w'));
  data.foods.forEach((f) => set(f.date, 'f'));
  data.bodyLogs.forEach((b) => b.weightKg && set(b.date, 'b'));
  // 生理期：僅選女性且有填週期才顯示，依上次開始日與週期天數往前後推算（每次標 5 天）
  const cycle = data.profile?.gender === 'female' ? data.profile.body.cycle : undefined;
  if (cycle?.lastStart && cycle.lengthDays > 0) {
    const start = fromKey(cycle.lastStart);
    for (let n = -3; n <= 6; n++) {
      for (let d = 0; d < 5; d++) {
        set(toKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + n * cycle.lengthDays + d)), 'p');
      }
    }
  }
  return m;
}
