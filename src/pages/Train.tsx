// ===== 分頁「跟練」：推薦菜單 + 動作圖庫（模組五） =====
import { useMemo, useState } from 'react';
import { BODY_PARTS, EXERCISES, SOURCE_LABEL } from '../data/exercises';
import { usePlanFor } from '../features/plan/useTodayPlan';
import { go } from '../router';
import type { Difficulty, Exercise } from '../types';

type Tab = 'plan' | 'library';

export function Train() {
  const [tab, setTab] = useState<Tab>('plan');
  return (
    <div className="page">
      <header className="page-head"><h1>跟練</h1></header>
      <div className="chips" role="tablist">
        <button className="chip" role="tab" aria-pressed={tab === 'plan'} onClick={() => setTab('plan')}>推薦菜單</button>
        <button className="chip" role="tab" aria-pressed={tab === 'library'} onClick={() => setTab('library')}>動作圖庫</button>
      </div>
      {tab === 'plan' ? <PlanView /> : <Library />}
    </div>
  );
}

function PlanView() {
  const { plan } = usePlanFor();
  if (!plan) return null;
  return (
    <>
      <section className="card accent">
        <span className="eyebrow" style={{ color: '#111' }}>今日推薦</span>
        <h2 style={{ fontSize: 22, margin: '4px 0 6px' }}>{plan.title}</h2>
        <p style={{ fontWeight: 500 }}>約 {plan.kcal} 大卡・{plan.blocks.reduce((n, b) => n + b.exercises.length, 0)} 個動作</p>
        <button className="btn dark" style={{ marginTop: 12 }} onClick={() => go('/session')}>開始跟練</button>
      </section>
      {plan.blocks.map((b) => (
        <section key={b.label} className="card">
          <h2>{b.label}<span className="tag num">{b.minutes} 分</span></h2>
          <div className="list">
            {b.exercises.map((e) => <ExerciseRow key={e.id} e={e} />)}
            {!b.exercises.length && <p className="empty">目前條件沒有符合的動作，試著在「我的」增加器材或運動類型。</p>}
          </div>
        </section>
      ))}
    </>
  );
}

function Library() {
  const [source, setSource] = useState<Exercise['source'] | 'all'>('all');
  const [part, setPart] = useState<string | null>(null);
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [noJump, setNoJump] = useState(false);

  const list = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (source === 'all' || e.source === source) &&
          (!part || e.bodyParts.includes(part)) &&
          (!diff || e.difficulty === diff) &&
          (!noJump || !e.jumping),
      ),
    [source, part, diff, noJump],
  );

  return (
    <>
      <section className="card flat stack">
        <span className="eyebrow">選擇部位</span>
        <div className="chips">
          {BODY_PARTS.map((b) => (
            <button key={b} className="chip" aria-pressed={part === b} onClick={() => setPart(part === b ? null : b)}>{b}</button>
          ))}
        </div>
        <span className="eyebrow">類型・難度</span>
        <div className="chips">
          {(['all', 'strength', 'yoga', 'cardio'] as const).map((s) => (
            <button key={s} className="chip" aria-pressed={source === s} onClick={() => setSource(s)}>
              {s === 'all' ? '全部' : SOURCE_LABEL[s]}
            </button>
          ))}
          {(['新手', '中階', '進階'] as Difficulty[]).map((d) => (
            <button key={d} className="chip" aria-pressed={diff === d} onClick={() => setDiff(diff === d ? null : d)}>{d}</button>
          ))}
          <button className="chip" aria-pressed={noJump} onClick={() => setNoJump(!noJump)}>不跳躍</button>
        </div>
      </section>
      <section className="card">
        <h2>{list.length} 個動作</h2>
        <div className="list">
          {list.map((e) => <ExerciseRow key={e.id} e={e} />)}
          {!list.length && <p className="empty">沒有符合的動作</p>}
        </div>
      </section>
    </>
  );
}

export function ExerciseRow({ e }: { e: Exercise }) {
  return (
    <a className="list-item" href={`#/exercise/${e.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
      <span className={`thumb ${e.source === 'strength' ? 's' : e.source === 'cardio' ? 'c' : ''}`}>{SOURCE_LABEL[e.source][0]}</span>
      <span className="grow">
        <span className="title">{e.name}</span>
        <span className="muted" style={{ display: 'block' }}>{e.bodyParts.join('・')}・{e.dose}</span>
      </span>
      <span className="tag">{e.difficulty}</span>
    </a>
  );
}
