/**
 * quickWorkout.ts
 * お任せコース: 自動プラン生成ロジック（純粋関数）
 */

import type { BodyPart, Exercise, UserProfile, WorkoutRecord } from '../types'
import {
  calculateInitial1RM,
  calculateInitialTargetWeight,
  calculateWeightForReps,
  roundToNearestPlate,
} from './calculations'

export type Focus = 'full' | 'upper' | 'lower' | 'custom'
export type CourseType = 'hypertrophy' | 'toning'

export interface PlannedExercise {
  exercise: Exercise
  targetSets: number
  targetReps: number
  targetWeight: number
  /** 'record' = 過去記録から算出 / 'estimate' = 初回推定 */
  weightSource: 'record' | 'estimate'
}

export interface QuickWorkoutPlan {
  minutes: number
  focus: Focus
  courseType: CourseType
  /** focus === 'custom' のとき選択された部位リスト */
  customBodyParts?: BodyPart[]
  exercises: PlannedExercise[]
  totalSets: number
  restSecondsPerSet: number
}

// ─────────────────────────────────────────────────────────────────────────────
// フォーカス別の部位優先順位
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_BODY_PARTS: Record<Exclude<Focus, 'custom'>, BodyPart[]> = {
  full:  ['back', 'legs', 'chest', 'shoulders', 'biceps', 'triceps', 'core'],
  upper: ['back', 'chest', 'shoulders', 'biceps', 'triceps'],
  lower: ['legs', 'core'],
}

/** プリセットフォーカスに対応する部位配列を返す */
export function getBodyPartsForFocus(focus: Exclude<Focus, 'custom'>): BodyPart[] {
  return FOCUS_BODY_PARTS[focus]
}

// ─────────────────────────────────────────────────────────────────────────────
// calcCapacity: 時間からセット数・種目数を算出
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 利用可能な時間から総セット数と種目数を計算する。
 *
 * - ウォームアップ・クールダウン: 8 分固定で引く
 * - 1 セット + インターバル = 3 分で計算
 * - 1 種目あたり 3 セット想定で種目数を決定
 * - 最大 8 種目 / 最小 1 種目
 */
export function calcCapacity(minutes: number): { totalSets: number; exerciseCount: number } {
  const workingMinutes = Math.max(minutes - 8, 0)
  const totalSets = Math.floor(workingMinutes / 3)
  const exerciseCount = Math.max(1, Math.min(Math.floor(totalSets / 3), 8))
  return { totalSets, exerciseCount }
}

// ─────────────────────────────────────────────────────────────────────────────
// 簡易 seeded random（外部ライブラリなし）
// ─────────────────────────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/** Fisher-Yates シャッフル（インプレース）*/
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─────────────────────────────────────────────────────────────────────────────
// buildQuickWorkoutPlan
// ─────────────────────────────────────────────────────────────────────────────

/**
 * フォーカス・時間・過去記録をもとに自動プランを生成する。
 *
 * 選出ロジック:
 * 1. フォーカス（またはカスタム部位）に対応する部位グループから優先順に種目を選出
 * 2. 各部位でコンパウンド種目を優先し、余裕があればアイソレーションを追加
 * 3. seed を指定すると決定論的な結果を返す（テスト用）
 * 4. focus === 'custom' && customBodyParts が空の場合は空プランを返す
 */
export function buildQuickWorkoutPlan(params: {
  minutes: number
  focus: Focus
  /** focus === 'custom' のときに使用する部位リスト */
  customBodyParts?: BodyPart[]
  courseType?: CourseType
  profile: UserProfile
  records: WorkoutRecord[]
  exercises: Exercise[]
  seed?: number
}): QuickWorkoutPlan {
  const { minutes, focus, customBodyParts, profile, records, exercises, seed } = params
  const course: CourseType = params.courseType ?? 'hypertrophy'
  const rand = seededRandom(seed ?? Date.now())

  // 部位リストの決定
  const bodyPartOrder: BodyPart[] = focus === 'custom'
    ? (customBodyParts ?? [])
    : FOCUS_BODY_PARTS[focus]

  // 0部位時は空プランを返す（UI側でボタン無効化を担保するが安全弁として）
  if (bodyPartOrder.length === 0) {
    return {
      minutes,
      focus,
      courseType: course,
      customBodyParts: [],
      exercises: [],
      totalSets: 0,
      restSecondsPerSet: 90,
    }
  }

  const { totalSets, exerciseCount } = calcCapacity(minutes)

  // 過去記録を種目ID でグループ化（最新順）
  const recordsByExercise = new Map<string, WorkoutRecord[]>()
  for (const r of records) {
    const list = recordsByExercise.get(r.exerciseId) ?? []
    list.push(r)
    recordsByExercise.set(r.exerciseId, list)
  }
  for (const [id, list] of recordsByExercise) {
    list.sort((a, b) => b.date.localeCompare(a.date))
    recordsByExercise.set(id, list)
  }

  // 種目候補を部位優先順 × compound 優先で並べる
  const candidates: Exercise[] = []
  for (const bp of bodyPartOrder) {
    const inBp = exercises.filter(e => e.bodyPart === bp)
    const compound  = shuffle(inBp.filter(e => e.category === 'compound'),  rand)
    const isolation = shuffle(inBp.filter(e => e.category === 'isolation'), rand)
    candidates.push(...compound, ...isolation)
  }

  // 重複排除しつつ exerciseCount 件選出
  const selected: Exercise[] = []
  const usedIds = new Set<string>()
  for (const ex of candidates) {
    if (selected.length >= exerciseCount) break
    if (!usedIds.has(ex.id)) {
      selected.push(ex)
      usedIds.add(ex.id)
    }
  }

  // セット配分: 余りを最初の種目に積む
  const baseSets = selected.length > 0 ? Math.floor(totalSets / selected.length) : 0
  const remainder = selected.length > 0 ? totalSets % selected.length : 0

  const TARGET_REPS = course === 'toning' ? 10 : 8

  const plannedExercises: PlannedExercise[] = selected.map((exercise, i) => {
    const targetSets = Math.max(1, baseSets + (i < remainder ? 1 : 0))

    const exerciseRecords = recordsByExercise.get(exercise.id) ?? []
    const bestOneRM = exerciseRecords.length > 0
      ? Math.max(...exerciseRecords.map(r => r.best1RM))
      : 0

    let targetWeight: number
    let weightSource: 'record' | 'estimate'

    if (bestOneRM > 0) {
      // 自己ベスト 1RM の 80% を目安重量とする
      targetWeight = roundToNearestPlate(bestOneRM * 0.8)
      weightSource = 'record'
    } else {
      // 初回: 体重・性別から推定
      if (course === 'toning') {
        const initial1RM = calculateInitial1RM(
          exercise.id, profile.weight, profile.gender, exercise.category,
        )
        targetWeight = roundToNearestPlate(calculateWeightForReps(initial1RM, 10))
      } else {
        targetWeight = calculateInitialTargetWeight(
          exercise.id, profile.weight, profile.gender, exercise.category,
        )
      }
      weightSource = 'estimate'
    }

    return {
      exercise,
      targetSets,
      targetReps: TARGET_REPS,
      targetWeight: Math.max(targetWeight, 2.5),
      weightSource,
    }
  })

  const restSecondsPerSet = course === 'toning'
    ? (exerciseCount <= 3 ? 90 : exerciseCount <= 5 ? 60 : 45)
    : (exerciseCount <= 3 ? 120 : exerciseCount <= 5 ? 90 : 60)

  return {
    minutes,
    focus,
    courseType: course,
    customBodyParts: focus === 'custom' ? bodyPartOrder : undefined,
    exercises: plannedExercises,
    totalSets,
    restSecondsPerSet,
  }
}
