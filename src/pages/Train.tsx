// ===== 分頁「跟練」：推薦菜單 + 動作圖庫（模組五） =====
import { useMemo, useState } from 'react';
import { BODY_PARTS, EXERCISES, SOURCE_LABEL } from '../data/exercises';
import { usePlanFor } from '../features/plan/useTodayPlan';
import { toKey } from '../lib/date';
import { exerciseById, suggestReplacements, withId, withoutId, type SlotView } from '../lib/planEdit';
import { go } from '../router';
import { useStore } from '../store/AppStore';
import type { Difficulty, Exercise } from '../types';

type Tab = 'plan' | 'library';

export function Train({ pick, replaceId }: { pick?: boolean; replaceId?: string }) {
  const [tab, setTab] = useState<Tab>('plan');
  if (pick) return <div className="page"><PickHeader replaceId={replaceId} /><Library pick replaceId={replaceId} /></div>;
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
  const today = toKey();
  const { plan, blocks, edited, periodMode, opts } = usePlanFor(today);
  const { editPlan } = useStore();
  if (!plan || !opts) return null;
  const inPlan = plan.blocks.flatMap((b) => b.exercises.map((e) => e.id));
  const count = inPlan.length;

  const remove = (s: SlotView) => {
    if (s.kind !== 'exercise') return;
    if (s.origin === 'added') return editPlan(today, (x) => ({ ...x, added: withoutId(x.added, s.e.id) }));
    if (s.origin === 'replaced' && s.replaces) {
      const id = s.replaces.id;
      return editPlan(today, (x) => {
        const r = { ...x.replace };
        delete r[id];
        return { ...x, replace: r };
      });
    }
    editPlan(today, (x) => ({ ...x, removed: withId(x.removed, s.e.id) }));
  };
  const restore = (id: string) =>
    editPlan(today, (x) => {
      const r = { ...x.replace };
      delete r[id];
      return { ...x, removed: withoutId(x.removed, id), replace: r };
    });
  const replaceWith = (removedId: string, newId: string) =>
    editPlan(today, (x) => ({ ...x, replace: { ...x.replace, [removedId]: newId } }));

  return (
    <>
      <section className="card accent">
        <span className="eyebrow" style={{ color: '#111' }}>今日推薦{edited ? '・已調整' : ''}</span>
        <h2 style={{ fontSize: 22, margin: '4px 0 6px' }}>{plan.title}</h2>
        <p style={{ fontWeight: 500 }}>約 {plan.kcal} 大卡・{count} 個動作</p>
        {periodMode && <p style={{ fontWeight: 700, marginTop: 4 }}>今天標記了生理期，已換成經期友善動作</p>}
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="btn dark" disabled={!count} onClick={() => go('/session')}>開始跟練</button>
          {edited && <button className="btn sm" onClick={() => editPlan(today, () => ({ removed: [], added: [] }))}>恢復原本菜單</button>}
        </div>
      </section>
      <p className="muted" style={{ textAlign: 'center' }}>不喜歡的動作按「✕」移除，會出現建議替換</p>
      {blocks.map((b) => (
        <section key={b.label} className="card">
          <h2>{b.label}<span className="tag num">{b.minutes} 分</span></h2>
          <div className="list">
            {b.slots.map((s) =>
              s.kind === 'removed' ? (
                <RemovedSlot
                  key={'r' + s.e.id}
                  e={s.e}
                  suggestions={suggestReplacements(s.e, b.label, inPlan, opts)}
                  onRestore={() => restore(s.e.id)}
                  onPick={(id) => replaceWith(s.e.id, id)}
                />
              ) : (
                <div key={s.e.id} className="plan-row">
                  <ExerciseRow e={s.e} badge={s.origin === 'added' ? '新增' : s.origin === 'replaced' ? '已替換' : undefined} />
                  <button className="row-x" aria-label={`移除 ${s.e.name}`} onClick={() => remove(s)}>✕</button>
                </div>
              ),
            )}
            {!b.slots.length && <p className="empty">目前條件沒有符合的動作，試著在「我的」增加器材或運動類型。</p>}
          </div>
          {b.label === '主訓練' && (
            <button className="btn sm block add-ex" onClick={() => go('/train/pick')}>＋ 從動作圖庫加入動作</button>
          )}
        </section>
      ))}
    </>
  );
}

function RemovedSlot({ e, suggestions, onRestore, onPick }: {
  e: Exercise; suggestions: Exercise[]; onRestore: () => void; onPick: (id: string) => void;
}) {
  return (
    <div className="removed-slot">
      <div className="between">
        <span><span className="muted">已移除：</span><s>{e.name}</s></span>
        <button className="link" onClick={onRestore}>復原</button>
      </div>
      {suggestions.length > 0 && (
        <>
          <span className="eyebrow">建議換成</span>
          <div className="suggest-list">
            {suggestions.map((x) => (
              <button key={x.id} className="suggest" onClick={() => onPick(x.id)}>
                <Thumb e={x} />
                <span className="grow"><b>{x.name}</b><small>{x.bodyParts.join('・')}・{x.difficulty}</small></span>
                <span className="suggest-add" aria-hidden>換</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button className="btn sm block" onClick={() => go(`/train/pick/${e.id}`)}>到動作圖庫自己挑 ›</button>
    </div>
  );
}

function PickHeader({ replaceId }: { replaceId?: string }) {
  const target = replaceId ? exerciseById(replaceId) : undefined;
  return (
    <header className="stack" style={{ gap: 6 }}>
      <button className="link" style={{ justifySelf: 'start' }} onClick={() => go('/train')}>← 回到菜單</button>
      <h1 style={{ fontSize: 26 }}>{target ? `替換「${target.name}」` : '加入動作'}</h1>
      <p className="muted">{target ? '選一個動作放在原本的位置' : '選好的動作會加到今天的主訓練最後面'}</p>
    </header>
  );
}

function Library({ pick, replaceId }: { pick?: boolean; replaceId?: string }) {
  const target = replaceId ? exerciseById(replaceId) : undefined;
  const [source, setSource] = useState<Exercise['source'] | 'all'>(target?.source ?? 'all');
  const [part, setPart] = useState<string | null>(target?.bodyParts.find((b) => b !== '全身') ?? null);
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [noJump, setNoJump] = useState(false);
  const today = toKey();
  const { plan } = usePlanFor(today);
  const { editPlan } = useStore();
  const inPlan = new Set(plan?.blocks.flatMap((b) => b.exercises.map((e) => e.id)) ?? []);

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

  const choose = (id: string) => {
    if (replaceId) editPlan(today, (x) => ({ ...x, removed: withId(x.removed, replaceId), replace: { ...x.replace, [replaceId]: id } }));
    else editPlan(today, (x) => ({ ...x, added: withId(x.added, id) }));
    go('/train');
  };

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
          {list.map((e) =>
            pick ? (
              <div key={e.id} className="plan-row">
                <ExerciseRow e={e} />
                {inPlan.has(e.id) ? (
                  <span className="tag" style={{ flex: 'none' }}>已在菜單</span>
                ) : (
                  <button className="btn sm primary pick-btn" onClick={() => choose(e.id)}>{replaceId ? '換這個' : '加入'}</button>
                )}
              </div>
            ) : (
              <ExerciseRow key={e.id} e={e} />
            ),
          )}
          {!list.length && <p className="empty">沒有符合的動作</p>}
        </div>
      </section>
    </>
  );
}

function Thumb({ e }: { e: Exercise }) {
  const [failed, setFailed] = useState(false);
  const showImg = e.media && e.media.kind !== 'video' && !failed;
  return (
    <span className={`thumb ${e.source === 'strength' ? 's' : e.source === 'cardio' ? 'c' : ''}`} style={showImg ? { background: '#fffdf8' } : undefined}>
      {showImg ? <img src={e.media!.src} alt="" onError={() => setFailed(true)} /> : SOURCE_LABEL[e.source][0]}
    </span>
  );
}

export function ExerciseRow({ e, badge }: { e: Exercise; badge?: string }) {
  return (
    <a className="list-item" href={`#/exercise/${e.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
      <Thumb e={e} />
      <span className="grow">
        <span className="title">{e.name}</span>
        <span className="muted" style={{ display: 'block' }}>{e.bodyParts.join('・')}・{e.dose}</span>
      </span>
      {badge ? <span className="tag fill">{badge}</span> : <span className="tag">{e.difficulty}</span>}
    </a>
  );
}
