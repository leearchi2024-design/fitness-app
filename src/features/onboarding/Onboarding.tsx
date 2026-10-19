// ===== 模組一 + 模組二：初次設定流程 =====
// 歡迎 → 性別 → 目標 → 運動類型 → 程度與器材 → 運動習慣 → 身體資料 → 計畫預覽
import { useMemo, useState, type ReactNode } from 'react';
import { buildPlanSummary } from '../../lib/calc';
import { buildWorkoutPlan, optionsFromProfile, WEEK_SCHEDULE } from '../../lib/workout';
import { toKey } from '../../lib/date';
import { useStore } from '../../store/AppStore';
import type { Equipment, UserProfile, WorkoutType } from '../../types';
import {
  ACTIVITIES, EQUIPMENTS, GENDERS, GOAL_LABEL, goalOptions, LEVELS, MINUTES, MODE_LABEL, WORKOUT_TYPES,
} from './options';

const STEPS = ['welcome', 'gender', 'goals', 'types', 'level', 'habit', 'body', 'preview'] as const;
type Step = (typeof STEPS)[number];
const QUESTION_STEPS: Step[] = ['gender', 'goals', 'types', 'level', 'habit', 'body'];

const DEFAULT: UserProfile = {
  gender: 'female',
  goals: [],
  workoutTypes: [],
  level: 'beginner',
  equipment: ['none', 'mat'],
  daysPerWeek: 3,
  minutesPerSession: 30,
  reminderTime: '19:30',
  body: { heightCm: 160, weightKg: 55, birthDate: '1998-01-01', activity: 'light' },
};

export function Onboarding({ initial, onSaved }: { initial?: UserProfile | null; onSaved?: () => void }) {
  const { setProfile } = useStore();
  const [step, setStep] = useState<Step>(initial ? 'gender' : 'welcome');
  const [p, setP] = useState<UserProfile>(initial ?? DEFAULT);
  const idx = STEPS.indexOf(step);
  const qIdx = QUESTION_STEPS.indexOf(step);

  const next = () => setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(idx - 1, initial ? 1 : 0)]);
  const patch = (x: Partial<UserProfile>) => setP((cur) => ({ ...cur, ...x }));
  const patchBody = (x: Partial<UserProfile['body']>) => setP((cur) => ({ ...cur, body: { ...cur.body, ...x } }));

  const canNext: Record<Step, boolean> = {
    welcome: true,
    gender: true,
    goals: p.goals.length > 0,
    types: p.workoutTypes.length > 0,
    level: true,
    habit: true,
    body: p.body.heightCm > 100 && p.body.weightKg > 25 && !!p.body.birthDate,
    preview: true,
  };

  // 可跳過的題目給預設值
  const skip = () => {
    if (step === 'goals' && !p.goals.length) patch({ goals: ['fitness'] });
    if (step === 'types' && !p.workoutTypes.length) patch({ workoutTypes: ['yoga', 'strength'] });
    next();
  };

  if (step === 'welcome') return <Welcome onStart={next} />;

  return (
    <div className="onboard">
      <div className="between">
        <button className="link" onClick={back} aria-label="上一步">← 上一步</button>
        {qIdx >= 0 && <span className="muted num">{qIdx + 1} / {QUESTION_STEPS.length}</span>}
      </div>
      {qIdx >= 0 && (
        <div className="progress" aria-hidden>
          {QUESTION_STEPS.map((s, i) => <i key={s} className={i <= qIdx ? 'on' : ''} />)}
        </div>
      )}

      {step === 'gender' && (
        <Question title="你的性別是？" hint="決定目標選項排序、預設示範教練與熱量公式，之後可在「我的」修改。">
          <div className="stack">
            {GENDERS.map((g) => (
              <button key={g.id} className="choice" aria-pressed={p.gender === g.id} onClick={() => patch({ gender: g.id })}>
                <b>{g.label}</b><small>{g.note}</small>
              </button>
            ))}
          </div>
        </Question>
      )}

      {step === 'goals' && (
        <Question title="你想達成什麼？" hint="最多選 3 個，點選順序就是優先順序，第 1 個為主要目標。">
          {goalOptions(p.gender).map((group) => (
            <div key={group.title} className="stack">
              <span className="eyebrow">{group.title}</span>
              <div className="choice-grid">
                {group.ids.map((id) => {
                  const order = p.goals.indexOf(id);
                  return (
                    <button
                      key={id} className="choice" aria-pressed={order >= 0}
                      onClick={() => patch({ goals: toggleLimited(p.goals, id, 3) })}
                    >
                      <b>{GOAL_LABEL[id]}</b>
                      {order >= 0 && <span className="order">{order + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Question>
      )}

      {step === 'types' && (
        <Question title="喜歡哪些運動？" hint="可多選。">
          <div className="choice-grid">
            {WORKOUT_TYPES.map((t) => (
              <button key={t.id} className="choice" aria-pressed={p.workoutTypes.includes(t.id)}
                onClick={() => patch({ workoutTypes: toggle<WorkoutType>(p.workoutTypes, t.id) })}>
                <b>{t.label}</b><small>{t.note}</small>
              </button>
            ))}
          </div>
        </Question>
      )}

      {step === 'level' && (
        <Question title="你的運動程度？">
          <div className="stack">
            {LEVELS.map((l) => (
              <button key={l.id} className="choice" aria-pressed={p.level === l.id} onClick={() => patch({ level: l.id })}>
                <b>{l.label}</b><small>{l.note}</small>
              </button>
            ))}
          </div>
          <span className="eyebrow">手邊有的器材</span>
          <div className="chips">
            {EQUIPMENTS.map((e) => (
              <button key={e.id} className="chip" aria-pressed={p.equipment.includes(e.id)}
                onClick={() => patch({ equipment: toggle<Equipment>(p.equipment, e.id) })}>{e.label}</button>
            ))}
          </div>
        </Question>
      )}

      {step === 'habit' && (
        <Question title="你的運動習慣？">
          <div className="field">
            <label>每週幾天：<span className="num">{p.daysPerWeek}</span> 天</label>
            <input type="range" min={2} max={6} value={p.daysPerWeek} onChange={(e) => patch({ daysPerWeek: +e.target.value })} />
          </div>
          <span className="eyebrow">每次時間</span>
          <div className="chips">
            {MINUTES.map((m) => (
              <button key={m} className="chip" aria-pressed={p.minutesPerSession === m} onClick={() => patch({ minutesPerSession: m })}>
                {m} 分鐘
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="remind">偏好時段（提醒時間）</label>
            <input id="remind" className="input" type="time" value={p.reminderTime ?? ''} onChange={(e) => patch({ reminderTime: e.target.value })} />
          </div>
        </Question>
      )}

      {step === 'body' && (
        <Question title="輸入身體資料" hint="用來計算 BMI、基礎代謝與每日建議熱量。">
          <div className="grid2">
            <NumField label="身高（cm）" value={p.body.heightCm} step={1} onChange={(v) => patchBody({ heightCm: v })} />
            <NumField label="體重（kg）" value={p.body.weightKg} step={0.1} onChange={(v) => patchBody({ weightKg: v })} />
          </div>
          <div className="field">
            <label htmlFor="bd">生日</label>
            <input id="bd" className="input" type="date" value={p.body.birthDate} onChange={(e) => patchBody({ birthDate: e.target.value })} />
          </div>
          <span className="eyebrow">日常活動量</span>
          <div className="choice-grid">
            {ACTIVITIES.map((a) => (
              <button key={a.id} className="choice" aria-pressed={p.body.activity === a.id} onClick={() => patchBody({ activity: a.id })}>
                <b>{a.label}</b><small>{a.note}</small>
              </button>
            ))}
          </div>
          <div className="grid2">
            <NumField label="目標體重（選填）" value={p.body.targetWeightKg} step={0.1} onChange={(v) => patchBody({ targetWeightKg: v || undefined })} />
            <NumField label="體脂率 %（選填）" value={p.body.bodyFatPct} step={0.1} onChange={(v) => patchBody({ bodyFatPct: v || undefined })} />
          </div>
          {p.gender === 'female' && (
            <div className="grid2">
              <NumField label="週期天數（選填）" value={p.body.cycle?.lengthDays} step={1}
                onChange={(v) => patchBody({ cycle: v ? { lengthDays: v, lastStart: p.body.cycle?.lastStart ?? toKey() } : undefined })} />
              <div className="field">
                <label htmlFor="cyc">上次開始日</label>
                <input id="cyc" className="input" type="date" value={p.body.cycle?.lastStart ?? ''}
                  onChange={(e) => patchBody({ cycle: { lengthDays: p.body.cycle?.lengthDays ?? 28, lastStart: e.target.value } })} />
              </div>
            </div>
          )}
          <p className="muted">未滿 18 歲、懷孕或有特殊疾病者，請先諮詢醫師。</p>
        </Question>
      )}

      {step === 'preview' && <Preview profile={p} />}

      <div className="onboard-foot">
        <div>
          {(step === 'goals' || step === 'types') && <button className="btn" onClick={skip}>跳過</button>}
          {step === 'preview' ? (
            <button className="btn primary" onClick={() => { setProfile(p); onSaved?.(); }}>{initial ? '儲存計畫' : '開始我的計畫'}</button>
          ) : (
            <button className="btn primary" disabled={!canNext[step]} onClick={next}>下一步</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="onboard" style={{ paddingTop: 40 }}>
      <div className="card dots" style={{ padding: 24 }}>
        <span className="eyebrow">個人化健身</span>
        <h1 style={{ fontSize: 40, margin: '8px 0 12px' }}>今天練什麼、<br />吃多少，<br />打開就知道。</h1>
        <p className="muted">約 1 分鐘回答 6 個問題，產生你的專屬計畫。</p>
      </div>
      <div className="stack">
        <button className="btn primary block" onClick={onStart}>訪客體驗，馬上開始</button>
        <button className="btn block" disabled>Email 登入（第二階段）</button>
        <div className="grid2">
          <button className="btn" disabled>Google</button>
          <button className="btn" disabled>Apple</button>
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>訪客資料只存在這台裝置上。</p>
      </div>
    </div>
  );
}

function Preview({ profile }: { profile: UserProfile }) {
  const s = useMemo(() => buildPlanSummary(profile), [profile]);
  const plan = useMemo(() => buildWorkoutPlan(optionsFromProfile(profile, toKey()), profile.body.weightKg), [profile]);
  const days = WEEK_SCHEDULE[profile.daysPerWeek] ?? [];
  return (
    <>
      <div>
        <span className="eyebrow">我的專屬計畫</span>
        <h1 style={{ fontSize: 28 }}>{profile.goals.map((g) => GOAL_LABEL[g]).join('・')}</h1>
      </div>
      {s.notices.map((n) => <div key={n.message} className="notice">{n.message}</div>)}
      <div className="card accent">
        <div className="between">
          <div className="stat"><b style={{ fontSize: 36 }}>{s.targetKcal}</b><span style={{ color: '#111' }}>每日建議熱量（{MODE_LABEL[s.mode]}）</span></div>
        </div>
      </div>
      <div className="grid2">
        <div className="card flat stat"><b>{s.bmi}</b><span>BMI</span></div>
        <div className="card flat stat"><b>{s.bmr}</b><span>基礎代謝 BMR</span></div>
        <div className="card flat stat"><b>{s.tdee}</b><span>每日消耗 TDEE</span></div>
        <div className="card flat stat"><b>{s.protein[0]}–{s.protein[1]}g</b><span>蛋白質</span></div>
      </div>
      <div className="card">
        <h2>一週課表</h2>
        <div className="cal" style={{ marginBottom: 8 }}>
          {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
            <div key={d} className="stack" style={{ gap: 4, justifyItems: 'center' }}>
              <span className="dow">{d}</span>
              <span className={days.includes(i) ? 'tag fill' : 'tag'}>{days.includes(i) ? '練' : '休'}</span>
            </div>
          ))}
        </div>
        <p className="muted">每次 {profile.minutesPerSession} 分鐘・第一次課表：{plan.title}</p>
      </div>
    </>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="stack" style={{ gap: 14 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 28 }}>{title}</h1>
        {hint && <p className="muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function NumField({ label, value, step, onChange }: { label: string; value?: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input num" type="number" inputMode="decimal" step={step} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : +e.target.value)} />
    </div>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
function toggleLimited<T>(list: T[], v: T, max: number): T[] {
  if (list.includes(v)) return list.filter((x) => x !== v);
  return list.length >= max ? list : [...list, v];
}

