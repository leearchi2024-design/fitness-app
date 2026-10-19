// ===== 分頁「今日」：今天的跟練菜單、熱量剩餘、喝水與打卡進度（模組一、二、五） =====
import { CalorieRing } from '../components/CalorieRing';
import { usePlanFor } from '../features/plan/useTodayPlan';
import { toKey, WEEKDAY } from '../lib/date';
import { go } from '../router';
import { useDay, useStore } from '../store/AppStore';

export function Today() {
  const { data, summary, addWater } = useStore();
  const today = toKey();
  const day = useDay(today);
  const { plan, training } = usePlanFor(today);
  if (!summary || !plan) return null;

  const done = day.workouts.length > 0;
  const streak = calcStreak(data.workouts.map((w) => w.date));
  const now = new Date();

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{now.getMonth() + 1} 月 {now.getDate()} 日・週{WEEKDAY[now.getDay()]}</span>
          <h1>今日</h1>
        </div>
        <span className="tag fill num">連續 {streak} 天</span>
      </header>

      {summary.notices.map((n) => <div key={n.message} className="notice">{n.message}</div>)}

      <section className="card">
        <h2>今日熱量</h2>
        <CalorieRing target={summary.targetKcal} eaten={day.eaten} burned={day.burned} addBack={data.settings.addBackExerciseKcal} />
        <div className="stack" style={{ marginTop: 14, gap: 6 }}>
          <div className="between muted"><span>蛋白質</span><span className="num">{day.protein} / {summary.protein[0]} g</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (day.protein / summary.protein[0]) * 100)}%` }} /></div>
        </div>
      </section>

      <section className={`card ${training && !done ? 'dots' : ''}`}>
        <h2>
          {done ? '今天練完了！' : training ? '今天的跟練' : '今天是休息日'}
          <span className="tag num">{plan.minutes} 分</span>
        </h2>
        {training || done ? (
          <>
            <p style={{ fontWeight: 700, fontSize: 18 }}>{plan.title}</p>
            <p className="muted" style={{ margin: '4px 0 12px' }}>
              {plan.blocks.map((b) => `${b.label} ${b.exercises.length} 個`).join('・')}・約 {plan.kcal} 大卡
            </p>
            <div className="row">
              <button className="btn primary" onClick={() => go('/session')}>{done ? '再練一次' : '開始跟練'}</button>
              <button className="btn" onClick={() => go('/train')}>看菜單</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 12 }}>好好休息也是訓練的一部分。想動一動可以做輕鬆伸展。</p>
            <button className="btn" onClick={() => go('/train')}>還是想練</button>
          </>
        )}
      </section>

      <section className="card">
        <h2>
          喝水
          <span className="num" style={{ fontSize: 15 }}>{day.waterMl} / {summary.waterMl} ml</span>
        </h2>
        <div className="bar accent" style={{ marginBottom: 12 }}>
          <i style={{ width: `${Math.min(100, (day.waterMl / summary.waterMl) * 100)}%` }} />
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => addWater(250)}>+250 ml</button>
          <button className="btn sm" onClick={() => addWater(500)}>+500 ml</button>
          <button className="btn sm" onClick={() => addWater(-250)}>−250</button>
        </div>
      </section>

      <section className="grid2">
        <button className="card" style={{ textAlign: 'left' }} onClick={() => go('/food')}>
          <span className="eyebrow">飲食</span>
          <p style={{ fontWeight: 900, fontSize: 18 }}>記錄這一餐</p>
        </button>
        <button className="card" style={{ textAlign: 'left' }} onClick={() => go(`/calendar/${today}`)}>
          <span className="eyebrow">身體</span>
          <p style={{ fontWeight: 900, fontSize: 18 }}>{day.body?.weightKg ? `${day.body.weightKg} kg` : '量體重'}</p>
        </button>
      </section>
    </div>
  );
}

/** 連續打卡天數（今天或昨天開始往回算） */
function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  const d = new Date();
  if (!set.has(toKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(toKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
