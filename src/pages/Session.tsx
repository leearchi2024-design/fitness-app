// ===== 模組 5-4：跟練模式 =====
// 大字倒數、組間休息、下一動作預告、語音口令、螢幕常亮、完成後自動寫入日曆。
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExerciseMediaView } from '../components/ExerciseMediaView';
import { usePlanFor } from '../features/plan/useTodayPlan';
import { toKey } from '../lib/date';
import { go } from '../router';
import { useStore } from '../store/AppStore';
import type { Exercise } from '../types';

const REST_SEC = 15;

/** 由建議量推估一個動作的計時秒數（計次型動作給預設值） */
export function workSeconds(e: Exercise): number {
  const min = e.dose.match(/(\d+)\s*分鐘/);
  if (min && e.source !== 'strength') return Math.min(+min[1] * 60, 180);
  const sec = e.dose.match(/(\d+)\s*秒/);
  if (sec) return +sec[1];
  return e.source === 'yoga' ? 45 : 40;
}

type Phase = 'work' | 'rest' | 'done';

export function Session() {
  const { plan } = usePlanFor();
  const { addWorkout } = useStore();
  const steps = useMemo(() => plan?.blocks.flatMap((b) => b.exercises.map((e) => ({ e, block: b.label }))) ?? [], [plan]);

  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('work');
  const [left, setLeft] = useState(() => (steps[0] ? workSeconds(steps[0].e) : 0));
  const [paused, setPaused] = useState(false);
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5>(3);
  const started = useRef(Date.now());

  useWakeLock(phase !== 'done');

  // 倒數
  useEffect(() => {
    if (paused || phase === 'done') return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [paused, phase]);

  // 時間到：切換到休息或下一個動作
  useEffect(() => {
    if (left > 0 || phase === 'done') return;
    if (phase === 'work') {
      if (i >= steps.length - 1) setPhase('done');
      else {
        setPhase('rest');
        setLeft(REST_SEC);
        speak(`休息，下一個：${steps[i + 1].e.name}`);
      }
    } else {
      jump(i + 1);
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  function jump(n: number) {
    if (n < 0) return;
    if (n >= steps.length) return setPhase('done');
    setI(n);
    setPhase('work');
    setLeft(workSeconds(steps[n].e));
    speak(steps[n].e.name);
  }

  if (!plan || !steps.length) {
    return <div className="page"><p className="empty">目前沒有菜單。</p><button className="btn" onClick={() => go('/train')}>回到跟練</button></div>;
  }

  const cur = steps[i];
  const nextStep = steps[i + 1];
  const progress = (i + (phase === 'done' ? 1 : 0)) / steps.length;

  if (phase === 'done') {
    const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    const kcal = Math.round((plan.kcal * minutes) / plan.minutes);
    return (
      <div className="session">
        <header />
        <main>
          <span className="eyebrow" style={{ color: 'var(--dot)' }}>完成！</span>
          <h1 style={{ fontSize: 34 }}>今天的你很棒 ✦</h1>
          <p className="num" style={{ fontSize: 22 }}>{minutes} 分鐘・約 {kcal} 大卡</p>
          <p>這次感覺如何？</p>
          <div className="row">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} className={`btn sm ${feeling === n ? 'primary' : ''}`} onClick={() => setFeeling(n)}>
                {['太簡單', '輕鬆', '剛好', '有點累', '太難'][n - 1]}
              </button>
            ))}
          </div>
        </main>
        <footer>
          <button
            className="btn primary block"
            onClick={() => {
              addWorkout({ date: toKey(), title: plan.title, minutes, kcal, feeling, exerciseIds: steps.map((s) => s.e.id) });
              go('/today');
            }}
          >
            儲存到日曆
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="session">
      <header className="stack">
        <div className="between">
          <button className="link" style={{ color: 'inherit' }} onClick={() => go('/train')}>✕ 結束</button>
          <span className="num">{i + 1} / {steps.length}</span>
        </div>
        <div className="bar"><i style={{ width: `${progress * 100}%` }} /></div>
      </header>
      <main>
        <span className="tag" style={{ borderColor: 'var(--paper)' }}>{phase === 'rest' ? '休息' : cur.block}</span>
        {phase === 'work' ? (
          <>
            <ExerciseMediaView key={cur.e.id} exercise={cur.e} variant="session" />
            <h1 style={{ fontSize: 30 }}>{cur.e.name}</h1>
            <p style={{ color: 'var(--dot)', maxWidth: 360 }}>{cur.e.cues}</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26 }}>喘口氣</h1>
            <p style={{ color: 'var(--dot)' }}>下一個：{nextStep?.e.name}</p>
          </>
        )}
        <div className="count" aria-live="polite">{Math.max(0, left)}</div>
        <p style={{ color: 'var(--dot)' }}>建議量：{cur.e.dose}</p>
      </main>
      <footer className="stack">
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className="btn sm" onClick={() => jump(i - 1)} disabled={i === 0}>上一個</button>
          <button className="btn sm primary" onClick={() => setPaused(!paused)}>{paused ? '繼續' : '暫停'}</button>
          <button className="btn sm" onClick={() => jump(i + 1)}>跳過</button>
        </div>
        {phase === 'rest' && <button className="btn sm" onClick={() => setLeft((s) => s + 15)}>休息延長 15 秒</button>}
        {phase === 'work' && nextStep && <p className="muted" style={{ color: 'var(--dot)', textAlign: 'center' }}>接下來：{nextStep.e.name}</p>}
      </footer>
    </div>
  );
}

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* 不支援語音時略過 */
  }
}

/** 螢幕常亮（支援 Wake Lock API 的瀏覽器） */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [active]);
}
