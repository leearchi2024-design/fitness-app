// ===== 分頁「我的」：個人資料、目標與計畫調整、設定、會員（模組一、二） =====
import { useState } from 'react';
import { GENDERS, GOAL_LABEL, LEVELS, MODE_LABEL, WORKOUT_TYPES } from '../features/onboarding/options';
import { Onboarding } from '../features/onboarding/Onboarding';
import { useStore } from '../store/AppStore';

export function Me() {
  const { data, summary, setAddBack, reset } = useStore();
  const [editing, setEditing] = useState(false);
  const p = data.profile;
  if (!p || !summary) return null;
  if (editing) return <EditWrap onDone={() => setEditing(false)} />;

  return (
    <div className="page">
      <header className="page-head"><h1>我的</h1></header>

      <section className="card dots">
        <span className="eyebrow">{GENDERS.find((g) => g.id === p.gender)?.label}・{summary.age} 歲・{LEVELS.find((l) => l.id === p.level)?.label}</span>
        <h2 style={{ fontSize: 22, margin: '4px 0 8px' }}>{p.goals.map((g) => GOAL_LABEL[g]).join('・')}</h2>
        <p className="muted">
          {p.workoutTypes.map((t) => WORKOUT_TYPES.find((w) => w.id === t)?.label).join('、')}・每週 {p.daysPerWeek} 天・每次 {p.minutesPerSession} 分鐘
        </p>
        <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>調整目標與計畫</button>
      </section>

      <section className="grid2">
        <div className="card flat stat"><b>{p.body.heightCm}</b><span>身高 cm</span></div>
        <div className="card flat stat"><b>{p.body.weightKg}</b><span>體重 kg</span></div>
        <div className="card flat stat"><b>{summary.bmi}</b><span>BMI</span></div>
        <div className="card flat stat"><b>{summary.targetKcal}</b><span>每日熱量（{MODE_LABEL[summary.mode]}）</span></div>
      </section>

      <section className="card">
        <h2>設定</h2>
        <label className="between" style={{ fontWeight: 700 }}>
          運動消耗加回剩餘熱量
          <input type="checkbox" checked={data.settings.addBackExerciseKcal} onChange={(e) => setAddBack(e.target.checked)} style={{ width: 22, height: 22 }} />
        </label>
        <p className="muted" style={{ marginTop: 6 }}>提醒時間：{p.reminderTime ?? '未設定'}（推播通知於第二階段開放）</p>
      </section>

      <section className="card flat">
        <h2>帳號與會員</h2>
        <p className="muted">目前為訪客模式，資料只存在這台裝置。登入、雲端同步、會員訂閱為後續階段功能。</p>
        <button className="btn sm" style={{ marginTop: 12 }} onClick={() => confirm('確定要清除這台裝置上的所有資料？') && reset()}>
          清除資料並重新設定
        </button>
      </section>

      <p className="muted" style={{ textAlign: 'center' }}>v0.1・第一階段 MVP</p>
    </div>
  );
}

function EditWrap({ onDone }: { onDone: () => void }) {
  const { data } = useStore();
  return (
    <div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '12px 16px 0' }}>
        <button className="link" onClick={onDone}>✕ 取消</button>
      </div>
      <Onboarding initial={data.profile} onSaved={onDone} />
    </div>
  );
}
