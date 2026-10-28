// ===== 分頁「日曆」：月曆、每日紀錄、身體變化週報（模組三） =====
import { useMemo, useState } from 'react';
import { NumInput } from '../components/NumInput';
import { Sticker } from '../components/Sticker';
import { monthGrid, fromKey, toKey } from '../lib/date';
import { cycleInfo, predictedPeriodDays } from '../lib/period';
import { isTrainingDay, trainingWeekdays } from '../lib/workout';
import { WeekPicker, WEEKDAYS_MON0 } from '../features/plan/WeekPicker';
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
  // 只顯示這個月：其他月份的格子留白，最後整排都是下個月的就不畫
  const cells = useMemo(() => {
    const all = monthGrid(view.y, view.m);
    const lastIdx = all.reduce((acc, d, i) => (d.getMonth() === view.m ? i : acc), 0);
    const rows = Math.ceil((lastIdx + 1) / 7);
    return all.slice(0, rows * 7);
  }, [view]);
  const female = data.profile?.gender === 'female';
  const predicted = useMemo(() => predictedPeriodDays(data), [data]);
  const weekdays = data.profile ? trainingWeekdays(data.profile) : [];
  const marks = useMemo(() => dayMarks(data), [data]);
  const stickers = useMemo(() => {
    const m: Record<string, string[]> = {};
    data.foods.forEach((f) => f.photoId && (m[f.date] ??= []).push(f.photoId));
    return m;
  }, [data.foods]);
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
            if (d.getMonth() !== view.m) return <span key={k} className="cal-blank" aria-hidden />;
            const mk = marks[k];
            const st = stickers[k];
            const period = female && data.days[k]?.period ? 'period' : female && predicted.has(k) ? 'period-pred' : '';
            // 建議訓練日：今天以後、還沒練的課表日
            const planDay = k >= todayKey && !mk?.w && isTrainingDay(weekdays, d) ? 'plan-day' : '';
            return (
              <button
                key={k}
                className={`${k === todayKey ? 'today' : ''} ${st ? 'has-sticker' : ''} ${period} ${planDay}`}
                aria-pressed={k === selected}
                aria-label={`${d.getMonth() + 1} 月 ${d.getDate()} 日${st ? `，${st.length} 張飲食貼紙` : ''}${period === 'period' ? '，生理期' : period ? '，預估生理期' : ''}${planDay ? '，建議訓練日' : ''}`}
                onClick={() => go(`/calendar/${k}`)}
              >
                {d.getDate()}
                {st && (
                  <span className="cal-sticker">
                    <Sticker photoId={st[st.length - 1]} size={24} />
                    {st.length > 1 && <span className="cal-more num">+{st.length - 1}</span>}
                  </span>
                )}
                <span className="marks">
                  {mk?.w && <i className="w" />}
                  {mk?.f && !st && <i className="f" />}
                  {mk?.b && <i className="b" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          <span><i className="lg-plan" />建議訓練日</span>
          <span><i style={{ background: 'var(--accent)' }} />運動完成</span>
          <span><i style={{ background: 'var(--ok)' }} />飲食已記錄（拍照的會顯示貼紙）</span>
          <span><i style={{ background: 'var(--dot)' }} />量了體重</span>
          {female && <span><i className="lg-period" />生理期</span>}
          {female && <span><i className="lg-period-pred" />預估</span>}
        </div>
      </section>

      <DayDetail key={selected} date={selected} />
      <ScheduleCard />
      <WeeklyReport />
    </div>
  );
}

function DayDetail({ date }: { date: string }) {
  const day = useDay(date);
  const { data, saveBodyLog, setPeriod } = useStore();
  const female = data.profile?.gender === 'female';
  const [form, setForm] = useState<BodyLog>(day.body ?? { date });
  const d = fromKey(date);

  return (
    <section className="card">
      <h2>{d.getMonth() + 1} 月 {d.getDate()} 日</h2>
      <div className="stack">
        <span className="eyebrow">運動</span>
        {!day.workouts.length && data.profile && date >= toKey() && isTrainingDay(trainingWeekdays(data.profile), d) && (
          <div className="row wrap plan-hint">
            <span className="tag fill">建議訓練日</span>
            {date === toKey() && <button className="btn sm primary" onClick={() => go('/session')}>開始跟練</button>}
          </div>
        )}
        {day.workouts.length ? (
          day.workouts.map((w) => (
            <p key={w.id}><b>{w.title}</b> <span className="muted">・{w.minutes} 分・{w.kcal} 大卡</span></p>
          ))
        ) : <p className="muted">尚無紀錄</p>}

        <span className="eyebrow">飲食（{day.eaten} 大卡）</span>
        {day.foods.some((f) => f.photoId) && (
          <div className="sticker-wall" aria-label="今天的飲食貼紙">
            {day.foods.filter((f) => f.photoId).map((f) => (
              <figure key={f.id}>
                <Sticker photoId={f.photoId!} size={76} label={f.name} />
                <figcaption>
                  {MEALS.find((m) => m.id === f.meal)?.label}・{f.name}
                  {f.kcal > 0 && <span className="num">　{f.kcal}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {MEALS.map((m) => {
          const items = day.foods.filter((f) => f.meal === m.id);
          return (
            <p key={m.id}><b>{m.label}</b> <span className="muted">{items.length ? items.map((f) => f.name).join('、') : '—'}</span></p>
          );
        })}

        {female && <PeriodToggle date={date} on={day.period} onChange={(v) => setPeriod(date, v)} />}

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

/** 我的一週課表：自己安排訓練日，日曆會標出建議訓練日 */
function ScheduleCard() {
  const { data, setProfile } = useStore();
  const p = data.profile;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number[]>([]);
  if (!p) return null;
  const days = trainingWeekdays(p);
  return (
    <section className="card">
      <div className="between">
        <h2>我的一週課表</h2>
        {!editing && <button className="btn sm" onClick={() => { setDraft(days); setEditing(true); }}>調整</button>}
      </div>
      {editing ? (
        <div className="stack" style={{ marginTop: 8 }}>
          <WeekPicker days={draft} onChange={setDraft} />
          <div className="row">
            <button className="btn sm dark" disabled={!draft.length} onClick={() => { setProfile({ ...p, trainingDays: draft, daysPerWeek: draft.length }); setEditing(false); }}>儲存</button>
            <button className="btn sm" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      ) : (
        <>
          <div className="week-picker" style={{ marginTop: 8 }} aria-label="一週課表">
            {WEEKDAYS_MON0.map((l, i) => (
              <span key={l} className="week-day" aria-pressed={days.includes(i)}><span>{l}</span><small>{days.includes(i) ? '練' : '休'}</small></span>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 8 }}>每週 {days.length} 天・每次 {p.minutesPerSession} 分鐘。日曆上虛線框的日子是建議訓練日。</p>
        </>
      )}
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
      <NumInput value={v} onChange={on} aria-label={label} />
    </div>
  );
}

function PeriodToggle({ date, on, onChange }: { date: string; on: boolean; onChange: (v: boolean) => void }) {
  const { data } = useStore();
  const info = useMemo(() => cycleInfo(data), [data]);
  const future = date > toKey();
  const next = info.nextStart ? fromKey(info.nextStart) : null;
  return (
    <div className="period-box">
      <span className="eyebrow">生理期</span>
      <button
        className={`period-toggle ${on ? 'on' : ''}`}
        aria-pressed={on}
        disabled={future}
        onClick={() => onChange(!on)}
      >
        <span className="period-check" aria-hidden>{on ? '✓' : ''}</span>
        <span className="grow">
          <b>這天有生理期</b>
          <small>{future ? '還沒到的日子不能標記' : on ? '已記錄，再點一次可取消' : '點一下記錄，日曆會顯示實心標記'}</small>
        </span>
      </button>
      {next && (
        <p className="muted" style={{ marginTop: 6 }}>
          下次預估 {next.getMonth() + 1}/{next.getDate()} 開始・週期 {info.cycleLength} 天{info.learned ? '（依你的紀錄計算）' : ''}・約 {info.periodLength} 天
        </p>
      )}
    </div>
  );
}

function dayMarks(data: AppData) {
  const m: Record<string, { w?: boolean; f?: boolean; b?: boolean }> = {};
  const set = (k: string, key: 'w' | 'f' | 'b') => ((m[k] ??= {})[key] = true);
  data.workouts.forEach((w) => set(w.date, 'w'));
  data.foods.forEach((f) => set(f.date, 'f'));
  data.bodyLogs.forEach((b) => b.weightKg && set(b.date, 'b'));
  return m;
}
