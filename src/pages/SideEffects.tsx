// ===== 健身常見副作用：清單與詳情 =====
import { useMemo, useState } from 'react';
import { IconBack } from '../components/Icons';
import { Markdown } from '../components/Markdown';
import {
  CATEGORIES, SIDE_EFFECTS, SIDE_EFFECT_BY_ID, relevantFor, severityLevel, splitPoints, userGroups,
  type SideEffect,
} from '../data/sideEffects';
import { useStore } from '../store/AppStore';

export function SeverityTag({ s }: { s: SideEffect }) {
  return <span className={`sev sev-${severityLevel(s.severity)}`}>{s.severity}</span>;
}

export function SideEffectList() {
  const { data, summary } = useStore();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const groups = useMemo(() => (data.profile && summary ? userGroups(data.profile, summary) : []), [data.profile, summary]);
  const mine = useMemo(() => relevantFor(groups).slice(0, 4), [groups]);
  const danger = SIDE_EFFECTS.filter((s) => severityLevel(s.severity) === 5);
  const list = SIDE_EFFECTS.filter(
    (s) => (!cat || s.category === cat) && (!q || `${s.name}${s.causes}${s.remedies}`.includes(q)),
  ).sort((a, b) => severityLevel(b.severity) - severityLevel(a.severity));

  return (
    <div className="page">
      <button className="link row" onClick={() => history.back()} style={{ gap: 4 }}><IconBack />返回</button>
      <header>
        <span className="eyebrow">身體狀況</span>
        <h1 style={{ fontSize: 30 }}>健身常見副作用</h1>
        <p className="muted">開始健身後常見的身體變化：為什麼會發生、怎麼改善、什麼時候要就醫。</p>
      </header>

      <section className="card danger-card">
        <h2>出現這些狀況，立即停止並就醫</h2>
        <div className="list">
          {danger.map((s) => (
            <a key={s.id} className="list-item" href={`#/care/${s.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <span className="grow">
                <span className="title">{s.name}</span>
                <span className="muted" style={{ display: 'block' }}>{s.seeDoctor}</span>
              </span>
            </a>
          ))}
        </div>
        <p style={{ fontWeight: 700, marginTop: 8 }}>緊急狀況請撥打 119。</p>
      </section>

      {mine.length > 0 && (
        <section className="card dots">
          <h2>和你的計畫比較相關</h2>
          <p className="muted" style={{ marginBottom: 6 }}>依你的設定：{groups.join('、')}</p>
          <div className="list">{mine.map((s) => <Row key={s.id} s={s} />)}</div>
        </section>
      )}

      <section className="card flat stack">
        <input className="input" placeholder="搜尋：痠痛、膝蓋、頭暈…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋副作用" />
        <div className="chips">
          <button className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>全部</button>
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{list.length} 項</h2>
        <div className="list">
          {list.map((s) => <Row key={s.id} s={s} />)}
          {!list.length && <p className="empty">找不到相符的項目</p>}
        </div>
      </section>

      <p className="muted" style={{ textAlign: 'center' }}>內容僅供參考，不能取代醫師診斷。</p>
    </div>
  );
}

function Row({ s }: { s: SideEffect }) {
  return (
    <a className="list-item" href={`#/care/${s.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
      <span className={`sev-dot sev-${severityLevel(s.severity)}`} aria-hidden />
      <span className="grow">
        <span className="title">{s.name}</span>
        <span className="muted" style={{ display: 'block' }}>{s.category}・{s.severity}</span>
      </span>
    </a>
  );
}

export function SideEffectDetail({ id }: { id: string }) {
  const s = SIDE_EFFECT_BY_ID[id];
  if (!s) return <div className="page"><p className="empty">找不到這個項目。</p></div>;
  const level = severityLevel(s.severity);
  return (
    <div className="page">
      <button className="link row" onClick={() => history.back()} style={{ gap: 4 }}><IconBack />返回</button>
      <header className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">{s.category}</span>
        <h1 style={{ fontSize: 28 }}>{s.name}</h1>
        <div className="chips">
          <SeverityTag s={s} />
          {s.groups.map((g) => <span key={g} className="tag">{g}</span>)}
        </div>
      </header>

      {level >= 4 && (
        <div className={`card ${level === 5 ? 'danger-card' : 'warn-card'}`}>
          <h2>何時就醫</h2>
          <p style={{ fontWeight: 700 }}>{s.seeDoctor}</p>
          {level === 5 && <p style={{ marginTop: 6 }}>緊急狀況請撥打 119。</p>}
        </div>
      )}

      {s.body ? (
        <section className="card flat"><Markdown text={s.body} /></section>
      ) : (
        <>
          <section className="card flat">
            <h2>主要原因</h2>
            <ul className="md-list">{splitPoints(s.causes).map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
          <section className="card">
            <h2>改善方式</h2>
            <ol className="md-list">{splitPoints(s.remedies).map((t) => <li key={t}>{t}</li>)}</ol>
          </section>
        </>
      )}

      {level < 4 && (
        <section className="card flat warn-card">
          <h2>何時就醫</h2>
          <p>{s.seeDoctor}</p>
        </section>
      )}

      {/* 「APP對應功能」是開發規劃用欄位（多數功能尚未開發），保留在資料中但不顯示給使用者 */}
      <p className="muted" style={{ textAlign: 'center' }}>內容僅供參考，不能取代醫師診斷。</p>
    </div>
  );
}
