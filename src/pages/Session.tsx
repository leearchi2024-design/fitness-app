// ===== 模組 5-4：跟練模式 =====
// 開始前倒數 3 秒、大字倒數、組間休息、下一動作預告、語音口令與嗶聲、螢幕常亮、完成後寫入日曆。
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExerciseMediaView } from '../components/ExerciseMediaView';
import { usePlanFor } from '../features/plan/useTodayPlan';
import { beep, speak, spokenDuration, stopSpeech, unlockCues, zhNumber, type BeepKind } from '../lib/cues';
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

type Phase = 'ready' | 'countdown' | 'work' | 'rest' | 'done';
export const COUNTDOWN_SEC = 3;

export interface RunStep {
  e: Exercise;
  /** 畫面上的小標籤（熱身／主訓練／收操／辦公室） */
  block: string;
  sec: number;
  side?: string;
}

export interface RunPlan {
  title: string;
  steps: RunStep[];
  restSec: number;
  minutes: number;
  kcal: number;
}

/** 今日訓練菜單的跟練 */
export function Session() {
  const { plan } = usePlanFor();
  const run = useMemo<RunPlan | null>(
    () =>
      plan && {
        title: plan.title,
        steps: plan.blocks.flatMap((b) => b.exercises.map((e) => ({ e, block: b.label, sec: workSeconds(e) }))),
        restSec: REST_SEC,
        minutes: plan.minutes,
        kcal: plan.kcal,
      },
    [plan],
  );
  return <SessionRunner plan={run} exitPath="/train" />;
}

/** 跟練畫面（訓練菜單與辦公室小運動共用） */
export function SessionRunner({ plan, exitPath }: { plan: RunPlan | null; exitPath: string }) {
  const { data, addWorkout, setSettings } = useStore();
  const voiceOn = data.settings.voice !== false;
  const beepOn = data.settings.beep !== false;
  const steps = plan?.steps ?? [];
  const REST = plan?.restSec ?? REST_SEC;

  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [left, setLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5>(3);
  const started = useRef(Date.now());
  const sound = useRef({ voiceOn, beepOn });
  sound.current = { voiceOn, beepOn };
  const say = (t: string) => sound.current.voiceOn && speak(t);
  const ding = (k: BeepKind) => sound.current.beepOn && beep(k);

  useWakeLock(phase !== 'done' && phase !== 'ready');

  // 每秒倒數
  useEffect(() => {
    if (paused || phase === 'done' || phase === 'ready') return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [paused, phase]);

  // 每一秒的提示音／語音，以及時間到的切換
  useEffect(() => {
    if (phase === 'done' || phase === 'ready') return;
    if (left > 0) {
      if (left <= 3) {
        ding('tick');
        say(zhNumber(left));
      } else if (phase === 'work' && left === 10 && steps[i].sec >= 25) {
        say('還剩 10 秒');
      }
      return;
    }
    if (phase === 'countdown') {
      started.current = Date.now();
      jump(0);
    } else if (phase === 'work') {
      if (i >= steps.length - 1) finish();
      else {
        const nx = steps[i + 1];
        setPhase('rest');
        setLeft(REST);
        ding('rest');
        if (nx.e.id === steps[i].e.id && nx.side) say(`換${nx.side}`);
        else say(REST >= 10 ? `休息 ${REST} 秒，下一個：${nx.e.name}` : `下一個：${nx.e.name}`);
      }
    } else {
      jump(i + 1);
    }
  }, [left, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 離開頁面時停止語音
  useEffect(() => () => stopSpeech(), []);

  function start() {
    unlockCues();
    setPhase('countdown');
    setLeft(COUNTDOWN_SEC);
  }

  function finish() {
    setPhase('done');
    ding('done');
    say('完成！今天的你很棒');
  }

  function jump(n: number) {
    if (n < 0) return;
    if (n >= steps.length) return finish();
    const st = steps[n];
    const sec = st.sec;
    setI(n);
    setPhase('work');
    setLeft(sec);
    ding('go');
    const sameAsPrev = n > 0 && steps[n - 1].e.id === st.e.id;
    const amount = st.e.source === 'strength' ? st.e.dose.replace(/×/g, '').replace(/[–~-]/g, '到') : spokenDuration(sec);
    if (sameAsPrev && st.side) say(`${st.side}，${spokenDuration(sec)}`);
    else say(`${n === 0 ? '開始，' : ''}${st.e.name}${st.side ? `，先做${st.side}` : ''}，${amount}`);
  }

  const togglePause = () => {
    if (!paused) stopSpeech();
    setPaused(!paused);
  };

  if (!plan || !steps.length) {
    return <div className="page"><p className="empty">目前沒有菜單。</p><button className="btn" onClick={() => go(exitPath)}>返回</button></div>;
  }

  const cur = steps[i];
  const nextStep = steps[i + 1];
  const progress = (i + (phase === 'done' ? 1 : 0)) / steps.length;

  if (phase === 'ready') {
    return (
      <div className="session">
        <header>
          <button className="link" style={{ color: 'inherit' }} onClick={() => go(exitPath)}>✕ 返回</button>
        </header>
        <main>
          <span className="eyebrow" style={{ color: 'var(--dot)' }}>準備好了嗎？</span>
          <h1 style={{ fontSize: 30 }}>{plan.title}</h1>
          <p style={{ color: 'var(--dot)' }}>{new Set(steps.map((s) => s.e.id)).size} 個動作・約 {plan.minutes} 分鐘・約 {plan.kcal} 大卡</p>
          <p style={{ color: 'var(--dot)' }}>第一個：{steps[0].e.name}</p>
          <div className="sound-toggles">
            <button className="sound-toggle" aria-pressed={voiceOn} onClick={() => setSettings({ voice: !voiceOn })}>
              <b>{voiceOn ? '🔊' : '🔇'} 語音</b><small>倒數數字・動作名稱</small>
            </button>
            <button className="sound-toggle" aria-pressed={beepOn} onClick={() => setSettings({ beep: !beepOn })}>
              <b>{beepOn ? '🔔' : '🔕'} 提示音</b><small>倒數嗶聲・換動作</small>
            </button>
          </div>
          <p style={{ color: 'var(--dot)', fontSize: 13 }}>iPhone 請關閉靜音模式才聽得到聲音</p>
        </main>
        <footer>
          <button className="btn primary block" style={{ fontSize: 20, padding: '14px' }} onClick={start}>開始（倒數 {COUNTDOWN_SEC} 秒）</button>
        </footer>
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="session">
        <header>
          <button className="link" style={{ color: 'inherit' }} onClick={() => { stopSpeech(); setPhase('ready'); }}>✕ 取消</button>
        </header>
        <main>
          <span className="eyebrow" style={{ color: 'var(--dot)' }}>預備</span>
          <div key={left} className="count countdown-pop" aria-live="assertive">{Math.max(1, left)}</div>
          <p style={{ color: 'var(--dot)' }}>第一個動作：{steps[0].e.name}</p>
        </main>
        <footer>
          <button className="btn sm block" onClick={() => { started.current = Date.now(); jump(0); }}>直接開始</button>
        </footer>
      </div>
    );
  }

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
          {feeling >= 4 && (
            <a href="#/care" style={{ color: 'var(--paper)', fontWeight: 700 }}>
              覺得太累或身體不舒服？看看常見狀況與處理方式 ›
            </a>
          )}
        </main>
        <footer>
          <button
            className="btn primary block"
            onClick={() => {
              addWorkout({ date: toKey(), title: plan.title, minutes, kcal, feeling, exerciseIds: [...new Set(steps.map((s) => s.e.id))] });
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
          <button className="link" style={{ color: 'inherit' }} onClick={() => go(exitPath)}>✕ 結束</button>
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
            {cur.side && <span className="tag fill">{cur.side}</span>}
            <p style={{ color: 'var(--dot)', maxWidth: 360 }}>{cur.e.cues}</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26 }}>{nextStep && nextStep.e.id === cur.e.id && nextStep.side ? `換${nextStep.side}` : REST >= 10 ? '喘口氣' : '準備下一個'}</h1>
            <p style={{ color: 'var(--dot)' }}>下一個：{nextStep?.e.name}{nextStep?.side ? `（${nextStep.side}）` : ''}</p>
          </>
        )}
        <div className="count" aria-live="polite">{Math.max(0, left)}</div>
        <p style={{ color: 'var(--dot)' }}>建議量：{cur.e.dose}</p>
      </main>
      <footer className="stack">
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className="btn sm" onClick={() => jump(i - 1)} disabled={i === 0}>上一個</button>
          <button className="btn sm primary" onClick={togglePause}>{paused ? '繼續' : '暫停'}</button>
          <button className="btn sm" onClick={() => jump(i + 1)}>跳過</button>
        </div>
        {phase === 'rest' && <button className="btn sm" onClick={() => setLeft((s) => s + 15)}>休息延長 15 秒</button>}
        {phase === 'work' && nextStep && <p className="muted" style={{ color: 'var(--dot)', textAlign: 'center' }}>接下來：{nextStep.e.name}</p>}
        <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
          <button className="link" style={{ color: 'var(--dot)' }} onClick={() => setSettings({ voice: !voiceOn })}>{voiceOn ? '🔊 語音開' : '🔇 語音關'}</button>
          <button className="link" style={{ color: 'var(--dot)' }} onClick={() => setSettings({ beep: !beepOn })}>{beepOn ? '🔔 提示音開' : '🔕 提示音關'}</button>
        </div>
      </footer>
    </div>
  );
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
