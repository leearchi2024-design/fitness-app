// 模組一的選項文字，集中管理方便之後調整文案或多語系
import type { ActivityLevel, Equipment, Gender, GoalId, Level, SessionMinutes, WorkoutType } from '../../types';

export const GENDERS: { id: Gender; label: string; note: string }[] = [
  { id: 'female', label: '女性', note: '女性示範教練、女性熱量公式' },
  { id: 'male', label: '男性', note: '男性示範教練、男性熱量公式' },
  { id: 'unspecified', label: '不透露', note: '熱量以中間值計算' },
];

export const GOAL_LABEL: Record<GoalId, string> = {
  lose_fat: '減重減脂', build_muscle: '增肌塑形', fitness: '提升體能', flexibility: '提升柔軟度', relax: '紓壓放鬆',
  legs_glutes: '練腿／臀', arms: '練手臂', back_posture: '練肩背／改善體態', chest: '練胸', core: '核心／腹肌',
  glute_lift: '翹臀', arm_tone: '蝴蝶袖', abs_line: '馬甲線', postpartum: '產後恢復',
  pecs: '胸肌', shoulders: '寬肩', biceps: '手臂', six_pack: '腹肌',
};

const COMMON: GoalId[] = ['lose_fat', 'build_muscle', 'fitness', 'flexibility', 'relax'];
const PARTS: GoalId[] = ['legs_glutes', 'arms', 'back_posture', 'chest', 'core'];
const FEMALE_FIRST: GoalId[] = ['glute_lift', 'arm_tone', 'abs_line', 'postpartum'];
const MALE_FIRST: GoalId[] = ['pecs', 'shoulders', 'biceps', 'six_pack'];

/** 依性別調整目標選項的排序（女性／男性優先顯示各自常見目標） */
export function goalOptions(gender: Gender): { title: string; ids: GoalId[] }[] {
  if (gender === 'female') return [{ title: '熱門', ids: FEMALE_FIRST }, { title: '整體', ids: COMMON }, { title: '部位', ids: PARTS }];
  if (gender === 'male') return [{ title: '熱門', ids: MALE_FIRST }, { title: '整體', ids: COMMON }, { title: '部位', ids: PARTS }];
  return [{ title: '整體', ids: COMMON }, { title: '部位', ids: PARTS }];
}

export const WORKOUT_TYPES: { id: WorkoutType; label: string; note: string }[] = [
  { id: 'yoga', label: '瑜珈', note: '柔軟度、紓壓' },
  { id: 'strength', label: '重訓', note: '增肌、線條' },
  { id: 'cardio', label: '有氧', note: '燃脂、心肺' },
  { id: 'pilates', label: '皮拉提斯', note: '核心、體態' },
  { id: 'hiit', label: 'HIIT', note: '短時間高強度' },
  { id: 'stretch', label: '伸展', note: '放鬆、恢復' },
];

export const LEVELS: { id: Level; label: string; note: string }[] = [
  { id: 'beginner', label: '完全新手', note: '很久沒運動或剛開始' },
  { id: 'occasional', label: '偶爾運動', note: '每月幾次' },
  { id: 'regular', label: '規律運動', note: '每週 2 次以上' },
];

export const EQUIPMENTS: { id: Equipment; label: string }[] = [
  { id: 'none', label: '徒手' },
  { id: 'mat', label: '瑜珈墊' },
  { id: 'dumbbell', label: '啞鈴' },
  { id: 'band', label: '彈力帶' },
  { id: 'gym', label: '健身房器材' },
];

export const MINUTES: SessionMinutes[] = [15, 30, 45, 60];

export const ACTIVITIES: { id: ActivityLevel; label: string; note: string }[] = [
  { id: 'sedentary', label: '久坐', note: '辦公室、很少走動' },
  { id: 'light', label: '輕度', note: '每天走路通勤' },
  { id: 'moderate', label: '中度', note: '常站立或走動的工作' },
  { id: 'high', label: '高度', note: '勞力工作或天天運動' },
];

export const MODE_LABEL = { lose: '減脂', maintain: '維持', gain: '增肌' } as const;
