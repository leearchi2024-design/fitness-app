// ===== 跟練提示：嗶聲（Web Audio）＋ 語音（Speech Synthesis） =====
// iPhone Safari 規定聲音一定要在使用者點擊後才能開始，所以要在「開始」按鈕裡呼叫 unlock()。

export type BeepKind = 'tick' | 'go' | 'rest' | 'done';

let ctx: AudioContext | null = null;
let voice: SpeechSynthesisVoice | null | undefined;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice;
  try {
    const all = window.speechSynthesis?.getVoices() ?? [];
    const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
    voice =
      all.find((v) => norm(v) === 'zh-tw') ??
      all.find((v) => norm(v).startsWith('zh-hant')) ??
      all.find((v) => norm(v).startsWith('zh')) ??
      null;
  } catch {
    voice = null;
  }
  return voice;
}

/** 在使用者點擊時呼叫一次：解鎖音效與語音 */
export function unlockCues() {
  const a = audio();
  a?.resume().catch(() => {});
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* 忽略 */
  }
}

function tone(freq: number, start: number, dur: number, gain = 0.25) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** 提示音：tick 倒數短嗶、go 開始長嗶、rest 休息雙音、done 完成三連音 */
export function beep(kind: BeepKind) {
  switch (kind) {
    case 'tick':
      return tone(880, 0, 0.12);
    case 'go':
      return tone(1320, 0, 0.45, 0.3);
    case 'rest':
      tone(660, 0, 0.15);
      return tone(520, 0.18, 0.25);
    case 'done':
      tone(784, 0, 0.18);
      tone(988, 0.2, 0.18);
      return tone(1319, 0.4, 0.5, 0.3);
  }
}

export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* 不支援語音時略過 */
  }
}

export function stopSpeech() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* 忽略 */
  }
}

const ZH_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
/** 倒數用的中文數字（「三、二、一」比「3」念得更清楚） */
export function zhNumber(n: number): string {
  return ZH_NUM[n] ?? String(n);
}

/** 秒數念法：45 → 「45 秒」，90 → 「1 分 30 秒」 */
export function spokenDuration(sec: number): string {
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m} 分 ${s} 秒` : `${m} 分鐘`;
}
