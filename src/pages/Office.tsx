// ===== 辦公室小運動：選時間＋部位 → 自動配菜單 → 跟練（與訓練菜單分開） =====
import { useMemo, useState } from 'react';
import { buildOfficePlan, OFFICE_EQUIPMENT, OFFICE_MINUTES, OFFICE_PARTS, officeSteps, type OfficeOptions } from '../lib/office';
import { go } from '../router';
import { useStore } from '../store/AppStore';
import type { Exercise } from '../types';
import { SessionRunner, type RunPlan } from './Session';

const DEFAULT: OfficeOptions = { minutes: 5, parts: ['neck', 'shoulder'], equipment: ['椅子'] };

function useOfficeOptions(): [OfficeOptions, (o: OfficeOptions) => void] {
  const { data, setSettings } = useStore();
  const o = data.settings.office ?? DEFAULT;
  return [o, (next) => setSettings({ office: { minutes: next.minutes, parts: next.parts, equipment: next.equipment } })];
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? (s ? `${m} 分 ${s} 秒` : `${m} 分鐘`) : `${s} 秒`;
}

export function Office() {
  const [o, setO] = useOfficeOptions();
  const [round, setRound] = useState(0);
  const seed = `office-${o.minutes}-${o.parts.join('.')}-${o.equipment.join('.')}-${round}`;
  const plan = useMemo(() => buildOfficePlan({ ...o, seed }), [o, seed]);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="page">
      <header className="stack" style={{ gap: 6 }}>
        <button className="link" style={{ justifySelf: 'start' }} onClick={() => go('/train')}>← 跟練</button>
        <h1>辦公室小運動</h1>
        <p className="muted">坐在位子上就能做的伸展放鬆。久坐每 1 小時起來動一下，不用換衣服、不會流汗。</p>
      </header>

      <section className="card stack">
        <span className="eyebrow">1・預計幾分鐘</span>
        <div className="chips">
          {OFFICE_MINUTES.map((m) => (
            <button key={m} className="chip" aria-pressed={o.minutes === m} onClick={() => { setO({ ...o, minutes: m }); setRound(0); }}>{m} 分鐘</button>
          ))}
        </div>

        <span className="eyebrow">2・想放鬆哪裡（可複選）</span>
        <div className="office-parts">
          <button className="choice" aria-pressed={!o.parts.length} onClick={() => { setO({ ...o, parts: [] }); setRound(0); }}>
            <b>全身放鬆</b><small>都來一點</small>
          </button>
          {OFFICE_PARTS.map((p) => (
            <button key={p.id} className="choice" aria-pressed={o.parts.includes(p.id)} onClick={() => { setO({ ...o, parts: toggle(o.parts, p.id) }); setRound(0); }}>
              <b>{p.label}</b><small>{p.note}</small>
            </button>
          ))}
        </div>

        <span className="eyebrow">3・身邊有什麼（徒手動作一定有）</span>
        <div className="chips">
          {OFFICE_EQUIPMENT.map((eq) => (
            <button key={eq} className="chip" aria-pressed={o.equipment.includes(eq)} onClick={() => { setO({ ...o, equipment: toggle(o.equipment, eq) }); setRound(0); }}>{eq}</button>
          ))}
        </div>
      </section>

      <section className="card accent office-plan">
        <span className="eyebrow" style={{ color: '#111' }}>幫你配好的菜單</span>
        <h2 style={{ fontSize: 22, margin: '4px 0' }}>{plan.title.replace('辦公室小運動｜', '')}</h2>
        <p style={{ fontWeight: 500 }}>{plan.exercises.length} 個動作・約 {fmt(plan.seconds)}</p>
        {plan.widened && <p style={{ fontSize: 13, marginTop: 4 }}>選的部位動作比較少，另外加了相鄰部位的伸展湊滿時間。</p>}
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="btn dark" disabled={!plan.exercises.length} onClick={() => go(`/office/go/${encodeURIComponent(seed)}`)}>開始跟練</button>
          <button className="btn sm" onClick={() => setRound((r) => r + 1)}>換一組</button>
        </div>
      </section>

      <section className="card">
        <h2>動作順序</h2>
        <div className="list">
          {plan.exercises.map((e, i) => <OfficeRow key={e.id} e={e} n={i + 1} />)}
          {!plan.exercises.length && <p className="empty">沒有符合的動作，試著多選一個器材或部位。</p>}
        </div>
      </section>
      <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>動作來自 Notion「辦公室小運動資料庫」。伸展到微緊就好，會痛請停止。</p>
    </div>
  );
}

function OfficeRow({ e, n }: { e: Exercise; n: number }) {
  const [failed, setFailed] = useState(false);
  const img = e.media && e.media.kind !== 'video' && !failed;
  return (
    <a className="list-item" href={`#/exercise/${e.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
      <span className="thumb office-thumb">
        {img ? <img src={e.media!.src} alt="" onError={() => setFailed(true)} /> : <b className="num">{n}</b>}
      </span>
      <span className="grow">
        <span className="title">{e.name}</span>
        <span className="muted" style={{ display: 'block' }}>{e.bodyParts.join('・')}・{e.dose}</span>
      </span>
      <span className="stack" style={{ gap: 4, justifyItems: 'end' }}>
        <span className="tag num">{fmt(officeSteps(e).reduce((t, x) => t + x.sec, 0))}</span>
        {e.equipment !== '徒手' && <small className="muted">{e.equipment}</small>}
      </span>
    </a>
  );
}

/** 辦公室小運動跟練（菜單依「上次的選擇＋種子」重新產生，重新整理也一樣） */
export function OfficeSession({ seed }: { seed: string }) {
  const [o] = useOfficeOptions();
  const { data } = useStore();
  const run = useMemo<RunPlan>(() => {
    const p = buildOfficePlan({ ...o, seed });
    const minutes = Math.max(1, Math.round(p.seconds / 60));
    const weight = data.profile?.body.weightKg ?? 60;
    return {
      title: p.title,
      steps: p.steps.map((s) => ({ e: s.e, block: '辦公室', sec: s.sec, side: s.side })),
      restSec: 5,
      minutes,
      kcal: Math.max(1, Math.round(2.3 * weight * (minutes / 60))),
    };
  }, [o, seed, data.profile?.body.weightKg]); // eslint-disable-line react-hooks/exhaustive-deps
  return <SessionRunner plan={run} exitPath="/office" />;
}
