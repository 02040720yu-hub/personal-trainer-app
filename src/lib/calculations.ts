/**
 * calculations.ts
 * 1RM・10RM 換算および初回目標重量の計算ロジック
 */

import type { WorkoutRecord } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Epley 式による 1RM 推定
//
// 式:  1RM = weight × (1 + reps / 30)
// 出典: Epley, B. (1985). Poundage Chart. Boyd Epley Workout.
//
// 注意:
//  - reps が 1〜10 の範囲で最も精度が高い。reps が増えるほど誤差が大きくなる。
//  - あくまで推定値。実際の 1RM はコンディション・種目・個人差に大きく左右される。
//  - 初心者は 1RM テストを行わず、この推定値を参考程度に使用すること。
// ─────────────────────────────────────────────────────────────────────────────

/** Epley 式で推定 1RM を算出する */
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * Epley 式の逆関数: 1RM から指定レップ数での目標重量を算出
 * 導出: 1RM = w × (1 + reps/30)  →  w = 1RM / (1 + reps/30)
 */
export function calculateWeightForReps(oneRM: number, targetReps: number): number {
  if (oneRM <= 0 || targetReps <= 0) return 0
  if (targetReps === 1) return oneRM
  return oneRM / (1 + targetReps / 30)
}

/**
 * 1RM から 10RM 相当の目標重量を算出
 * Epley 式より: 10RM ≈ 1RM × (30/40) = 1RM × 0.75
 */
export function calculate10RMTarget(oneRM: number): number {
  return calculateWeightForReps(oneRM, 10)
}

/** 複数セットの中から最大の推定 1RM を取得 */
export function getBest1RM(sets: { weight: number; reps: number }[]): number {
  if (sets.length === 0) return 0
  return Math.max(...sets.map(s => calculate1RM(s.weight, s.reps)))
}

/** 種目の全履歴レコードから自己ベスト推定 1RM を取得 */
export function getBestHistoricalOneRM(exerciseId: string, records: WorkoutRecord[]): number {
  const recs = records.filter(r => r.exerciseId === exerciseId)
  if (recs.length === 0) return 0
  return Math.max(...recs.map(r => r.best1RM))
}

/**
 * 自己ベスト 1RM から次回目安（重量・回数）を算出
 * - 重量: 1RM の 80%（2.5kg 単位に丸め）
 * - 回数: 筋肥大=8回 / 引き締め=10回
 */
export function calcNextTarget(
  best1RM: number,
  courseType: 'hypertrophy' | 'toning',
): { weight: number; reps: number } {
  const reps = courseType === 'hypertrophy' ? 8 : 10
  const weight = Math.max(roundToNearestPlate(best1RM * 0.8), 2.5)
  return { weight, reps }
}

/**
 * 重量をジム標準のプレート単位（2.5 kg）に丸める
 * 根拠: 多くのジムで利用可能な最小プレートが 1.25 kg × 2 = 2.5 kg のため。
 */
export function roundToNearestPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5
}

// ─────────────────────────────────────────────────────────────────────────────
// 初回目標重量の推定
//
// 根拠と注意事項:
//  - Starting Strength (Mark Rippetoe) および ExRx.net の初心者基準値を参考に
//    「体重の何倍を初回推定 1RM とするか」をマルチプライヤーとして定義。
//  - 男女差は一般的な筋力差の傾向（女性は男性の約 55〜65%）を反映。
//  - 数値は科学的に厳密なものではなく、あくまで「初回セッションの安全な目安」。
//  - 個人差（運動歴・体型・年齢）が大きいため、実際には軽めから試すこと。
// ─────────────────────────────────────────────────────────────────────────────

type GenderKey = 'male' | 'female'

/** 種目ごとの初回推定 1RM マルチプライヤー（体重比） */
const INITIAL_1RM_MULTIPLIERS: Record<string, Record<GenderKey, number>> = {
  // コンパウンド（大筋群）
  'squat':                   { male: 0.75, female: 0.50 },
  'bench-press':             { male: 0.50, female: 0.30 },
  'deadlift':                { male: 0.90, female: 0.60 },
  'overhead-press':          { male: 0.35, female: 0.20 },
  'barbell-row':             { male: 0.50, female: 0.33 },
  'incline-bench-press':     { male: 0.43, female: 0.25 },
  'decline-bench-press':     { male: 0.53, female: 0.33 },
  'romanian-deadlift':       { male: 0.70, female: 0.47 },
  'leg-press':               { male: 1.20, female: 0.80 },
  'dumbbell-shoulder-press': { male: 0.25, female: 0.15 }, // 片手あたりのダンベル重量
  'upright-row':             { male: 0.40, female: 0.25 },
  'seated-row':              { male: 0.50, female: 0.33 },
  'lat-pulldown':            { male: 0.60, female: 0.40 },
  'one-arm-row':             { male: 0.30, female: 0.20 }, // 片手あたりのダンベル重量
  'close-grip-bench':        { male: 0.43, female: 0.25 },
  'lunge':                   { male: 0.50, female: 0.33 }, // バーベル重量

  // アイソレーション（小筋群）
  'barbell-curl':            { male: 0.25, female: 0.15 },
  'dumbbell-curl':           { male: 0.15, female: 0.10 }, // 片手あたりのダンベル重量
  'hammer-curl':             { male: 0.15, female: 0.10 },
  'concentration-curl':      { male: 0.12, female: 0.08 },
  'preacher-curl':           { male: 0.22, female: 0.13 },
  'triceps-pushdown':        { male: 0.27, female: 0.17 },
  'skull-crusher':           { male: 0.25, female: 0.15 },
  'overhead-triceps':        { male: 0.18, female: 0.11 }, // 両手で持つダンベル重量
  'lateral-raise':           { male: 0.08, female: 0.05 }, // 片手あたりのダンベル重量
  'front-raise':             { male: 0.08, female: 0.05 },
  'dumbbell-fly':            { male: 0.12, female: 0.08 },
  'cable-crossover':         { male: 0.18, female: 0.12 },
  'face-pull':               { male: 0.18, female: 0.12 },
  'leg-curl':                { male: 0.30, female: 0.20 },
  'leg-extension':           { male: 0.38, female: 0.25 },
  'calf-raise':              { male: 0.80, female: 0.53 },
  'cable-crunch':            { male: 0.25, female: 0.17 },
}

// 定義されていない種目のデフォルトマルチプライヤー
const DEFAULT_MULTIPLIERS: Record<'compound' | 'isolation', Record<GenderKey, number>> = {
  compound:  { male: 0.50, female: 0.33 },
  isolation: { male: 0.25, female: 0.17 },
}

/** 初回セッション用の推定 1RM を算出 */
export function calculateInitial1RM(
  exerciseId: string,
  bodyWeight: number,
  gender: GenderKey,
  category: 'compound' | 'isolation',
): number {
  const m = INITIAL_1RM_MULTIPLIERS[exerciseId] ?? DEFAULT_MULTIPLIERS[category]
  return bodyWeight * m[gender]
}

/**
 * 初回目標重量（10RM 相当）を算出
 * @returns 2.5 kg 単位に丸めた目標重量（最小 2.5 kg）
 */
export function calculateInitialTargetWeight(
  exerciseId: string,
  bodyWeight: number,
  gender: GenderKey,
  category: 'compound' | 'isolation',
): number {
  const initial1RM = calculateInitial1RM(exerciseId, bodyWeight, gender, category)
  const target = calculate10RMTarget(initial1RM)
  return Math.max(roundToNearestPlate(target), 2.5)
}
