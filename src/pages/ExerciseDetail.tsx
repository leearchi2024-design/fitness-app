// ===== 模組 5-2：動作詳情頁 =====
import { ExerciseMediaView } from '../components/ExerciseMediaView';
import { IconBack } from '../components/Icons';
import { EXERCISE_BY_ID, SOURCE_LABEL } from '../data/exercises';

export function ExerciseDetail({ id }: { id: string }) {
  const e = EXERCISE_BY_ID[id];
  if (!e) return <div className="page"><p className="empty">找不到這個動作。</p></div>;
  return (
    <div className="page">
      <button className="link row" onClick={() => history.back()} style={{ gap: 4 }}><IconBack />返回</button>
      <header>
        <span className="eyebrow">{SOURCE_LABEL[e.source]}・{e.difficulty}</span>
        <h1 style={{ fontSize: 30 }}>{e.name}</h1>
        {e.nameEn && <p className="muted">{e.nameEn}</p>}
      </header>

      <ExerciseMediaView exercise={e} />

      <div className="chips">
        {e.bodyParts.map((b) => <span key={b} className="tag fill">{b}</span>)}
        <span className="tag">{e.equipment}</span>
        {e.tags.filter((t) => t !== e.equipment).map((t) => <span key={t} className="tag">{t}</span>)}
        {e.jumping && <span className="tag">需跳躍</span>}
        {e.periodFriendly && <span className="tag">經期可做</span>}
      </div>

      <section className="card">
        <h2>建議量</h2>
        <p className="num" style={{ fontSize: 20 }}>{e.dose}</p>
      </section>
      {e.muscles && (
        <section className="card flat"><h2>主要肌群</h2><p>{e.muscles}</p></section>
      )}
      <section className="card flat"><h2>{e.source === 'yoga' ? '功效' : '動作方式'}</h2><p>{e.cues}</p></section>
      {e.cautions && (
        <section className="card flat"><h2>{e.source === 'yoga' ? '注意事項' : '注意要點（常見錯誤）'}</h2><p>{e.cautions}</p></section>
      )}
      {e.easier && <section className="card flat"><h2>簡化版</h2><p>{e.easier}</p></section>}
    </div>
  );
}
