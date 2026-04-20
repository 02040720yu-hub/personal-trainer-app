/** 週次目標の保存・読み込み */

export interface WeeklyGoals {
  targetSets: number   // 今週の目標セット数（0 = 未設定）
  targetReps: number   // 今週の目標総レップ数（0 = 未設定）
}

const GOALS_KEY = 'wt_goals_v1'

export function loadGoals(): WeeklyGoals {
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    if (raw) return JSON.parse(raw) as WeeklyGoals
  } catch { /* ignore */ }
  return { targetSets: 0, targetReps: 0 }
}

export function saveGoals(goals: WeeklyGoals): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}
