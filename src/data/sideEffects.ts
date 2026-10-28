// ===== 健身常見副作用（Notion「健身常見副作用」資料庫） =====
import raw from './notion/side-effects.json';
import type { PlanSummary } from '../lib/calc';
import { bmi } from '../lib/calc';
import type { UserProfile } from '../types';

export type Severity = '輕微・多為暫時' | '無害・外觀問題' | '需調整訓練' | '需留意就醫' | '危險・立即就醫';

export interface SideEffect {
  id: string;
  notionId?: string;
  name: string;
  category: string;
  severity: Severity;
  groups: string[];
  causes: string;
  remedies: string;
  seeDoctor: string;
  appFeature?: string;
  /** Notion 頁面內文（同步程式抓取，Markdown） */
  body?: string;
}

interface Row {
  id: string; notionId?: string; 副作用: string; 類別: string; 嚴重程度: Severity; 常見族群: string[];
  主要原因: string; 改善方式: string; 何時就醫: string; APP對應功能?: string; 內文?: string;
}

export const SIDE_EFFECTS: SideEffect[] = (raw as Row[]).map((r) => ({
  id: r.id,
  notionId: r.notionId,
  name: r.副作用,
  category: r.類別,
  severity: r.嚴重程度,
  groups: r.常見族群,
  causes: r.主要原因,
  remedies: r.改善方式,
  seeDoctor: r.何時就醫,
  appFeature: r.APP對應功能,
  body: r.內文,
}));

export const SIDE_EFFECT_BY_ID: Record<string, SideEffect> = Object.fromEntries(SIDE_EFFECTS.map((s) => [s.id, s]));

/** 嚴重程度由輕到重的順序與顯示用的等級（1–5） */
export const SEVERITY_ORDER: Severity[] = ['無害・外觀問題', '輕微・多為暫時', '需調整訓練', '需留意就醫', '危險・立即就醫'];
export const severityLevel = (s: Severity) => SEVERITY_ORDER.indexOf(s) + 1;

export const CATEGORIES = [...new Set(SIDE_EFFECTS.map((s) => s.category))];

/** 由使用者設定推算屬於哪些「常見族群」 */
export function userGroups(p: UserProfile, summary: Pick<PlanSummary, 'mode'>): string[] {
  const g = new Set<string>();
  if (p.level === 'beginner') g.add('健身新手');
  if (p.gender === 'female') g.add('女性');
  if (p.goals.includes('postpartum')) g.add('產後女性');
  if (summary.mode === 'lose') g.add('減脂期');
  if (summary.mode === 'gain') g.add('增肌期');
  if (p.workoutTypes.includes('hiit')) g.add('高強度訓練');
  if (p.workoutTypes.includes('cardio') || p.workoutTypes.includes('hiit')) {
    g.add('跑步跳躍');
    g.add('高衝擊有氧');
  }
  if (bmi(p.body.weightKg, p.body.heightCm) >= 27) g.add('體重較重者');
  return [...g];
}

/** 與使用者相關的副作用：依符合的族群數、再依嚴重程度排序 */
export function relevantFor(groups: string[], list = SIDE_EFFECTS): SideEffect[] {
  return list
    .map((s) => ({ s, hit: s.groups.filter((x) => groups.includes(x)).length }))
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit || severityLevel(b.s.severity) - severityLevel(a.s.severity))
    .map((x) => x.s);
}

/** 「；」或「、」分隔的長句拆成條列 */
export function splitPoints(text: string): string[] {
  return text.split(/；/).map((t) => t.trim()).filter(Boolean);
}
