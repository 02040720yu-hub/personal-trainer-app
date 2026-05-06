/**
 * quickWorkout.ts
 * お任せコース: 自動プラン生成ロジック（純粋関数）
 */

import type { BodyPart, Exercise, UserProfile, WorkoutRecord } from '../types'
import {
  calculateInitialTargetWeightForExercise,
  roundToNearestPlate,
} from './calculations'
import { EXERCISES } from '../data/exercises'

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
// 候補抽出ヘルパー（コース・難易度・ヒップ優遇）
// ─────────────────────────────────────────────────────────────────────────────

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

/** 引き締めコースで legs 部位の候補リスト先頭に並べたいヒップ系種目 ID */
const HIP_PRIORITY_IDS = new Set<string>([
  'hip-thrust',
  'hip-abduction',
  'glute-bridge',
  'kickback',
  'romanian-deadlift',
  'bulgarian-split-squat',
])

/** toning のときヒップ系種目を先頭に並べ直す。それ以外は no-op */
function applyHipPriority(exercises: Exercise[], course: CourseType): Exercise[] {
  if (course !== 'toning') return exercises
  const hip  = exercises.filter(e => HIP_PRIORITY_IDS.has(e.id))
  const rest = exercises.filter(e => !HIP_PRIORITY_IDS.has(e.id))
  return [...hip, ...rest]
}

/**
 * 部位ごとに候補リストを構築する。
 *  1. その部位 × suitableFor[course] でフィルタ
 *  2. experienceLevel で難易度フィルタ。結果が 0 件になる場合はフィルタを緩和
 *  3. compound 優先 → isolation の順に並べ、それぞれ内部はシャッフル
 *  4. legs × toning のときだけ、ヒップ系種目を候補先頭に並べ替え
 *     （他部位の候補を侵食しないよう、bp 内に閉じた処理にしている）
 */
function getCandidatesForBodyPart(
  bp: BodyPart,
  exercises: Exercise[],
  course: CourseType,
  experienceLevel: ExperienceLevel | undefined,
  rand: () => number,
): Exercise[] {
  const inBp = exercises.filter(e => e.bodyPart === bp && e.suitableFor[course])

  let filtered = inBp
  if (experienceLevel === 'beginner') {
    const beginnerOnly = inBp.filter(e => e.difficulty === 'beginner')
    filtered = beginnerOnly.length > 0 ? beginnerOnly : inBp
  } else if (experienceLevel === 'intermediate') {
    const notAdvanced = inBp.filter(e => e.difficulty !== 'advanced')
    filtered = notAdvanced.length > 0 ? notAdvanced : inBp
  }

  const compound  = shuffle(filtered.filter(e => e.category === 'compound'),  rand)
  const isolation = shuffle(filtered.filter(e => e.category === 'isolation'), rand)
  let result = [...compound, ...isolation]

  // legs × toning のときだけヒップ優遇を bp 内に閉じて適用
  if (bp === 'legs' && course === 'toning') {
    result = applyHipPriority(result, course)
  }

  return result
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
  /** ユーザー経験レベル（未指定なら全難易度を候補に含める） */
  experienceLevel?: ExperienceLevel
  profile: UserProfile
  records: WorkoutRecord[]
  exercises: Exercise[]
  seed?: number
}): QuickWorkoutPlan {
  const { minutes, focus, customBodyParts, experienceLevel, profile, records, exercises, seed } = params
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

  // 部位ごとに候補リストを別々に保持（ヒップ優遇は getCandidatesForBodyPart 内で
  // legs かつ toning のときだけ適用される）
  const candidatesByBp = new Map<BodyPart, Exercise[]>()
  for (const bp of bodyPartOrder) {
    candidatesByBp.set(
      bp,
      getCandidatesForBodyPart(bp, exercises, course, experienceLevel, rand),
    )
  }

  // ラウンドロビンで部位を順に巡回し、1種目ずつ取る。
  // これにより「全身プリセットで脚4種目」のような偏りを防ぐ。
  const selected: Exercise[] = []
  const usedIds = new Set<string>()
  const cursors = new Map<BodyPart, number>(
    bodyPartOrder.map(bp => [bp, 0])
  )

  while (selected.length < exerciseCount) {
    let pickedThisRound = false

    for (const bp of bodyPartOrder) {
      if (selected.length >= exerciseCount) break

      const list = candidatesByBp.get(bp) ?? []
      let cursor = cursors.get(bp) ?? 0

      // この部位の未使用種目を探す
      while (cursor < list.length && usedIds.has(list[cursor].id)) {
        cursor++
      }

      if (cursor < list.length) {
        selected.push(list[cursor])
        usedIds.add(list[cursor].id)
        cursors.set(bp, cursor + 1)
        pickedThisRound = true
      } else {
        cursors.set(bp, list.length)
      }
    }

    // 全部位枯渇 → 終了
    if (!pickedThisRound) break
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
      // ユーザーが履歴で見ている「次回目標」と一致させるため、最新レコードの
      // nextTargetWeight をそのまま使う。値が無い旧データの場合のみ best1RM × 80% にフォールバック。
      const latest = exerciseRecords[0] // recordsByExercise は date desc 済み
      targetWeight = latest.nextTargetWeight > 0
        ? latest.nextTargetWeight
        : roundToNearestPlate(bestOneRM * 0.8)
      weightSource = 'record'
    } else {
      // 初回: 体重・性別 × 種目別マルチプライヤーから推定
      // (内部で 10RM 相当 × FIRST_SESSION_DISCOUNT(0.75)、バーベルは最小 20kg 保証)
      targetWeight = calculateInitialTargetWeightForExercise(
        exercise, profile.weight, profile.gender,
      )
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

// ─────────────────────────────────────────────────────────────────────────────
// recommendTodaysFocus: 履歴ベースの今日の推薦
// ─────────────────────────────────────────────────────────────────────────────

export interface TodaysRecommendation {
  /** 引き締めコース時のプリセット */
  toningPreset?: 'full' | 'lower' | 'upper'
  /** 筋肥大コース時のフォーカス */
  hypertrophyFocus?: 'full' | 'upper' | 'lower'
  /** 推薦根拠を表示する文言（20〜40字程度） */
  reason: string
}

const ALL_BODY_PARTS: BodyPart[] = [
  'chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core',
]

/**
 * 各部位について、最後にトレーニングしてからの経過日数を返す。
 * 一度も鍛えていない部位は null。
 */
export function computeDaysSinceLastTraining(
  records: WorkoutRecord[],
  now: Date = new Date(),
): Map<BodyPart, number | null> {
  const result = new Map<BodyPart, number | null>(
    ALL_BODY_PARTS.map(bp => [bp, null])
  )

  // 種目ID → 部位 のマップ（hidden 種目もカバー: data 側の ALL_EXERCISES でなく
  // 公開 EXERCISES で十分。過去レコードに hidden 種目があった場合は無視される）
  const exerciseToBp = new Map<string, BodyPart>(
    EXERCISES.map(e => [e.id, e.bodyPart])
  )

  // 各部位の最新レコード日を求める
  const lastDateByBp = new Map<BodyPart, Date>()
  for (const r of records) {
    const bp = exerciseToBp.get(r.exerciseId)
    if (!bp) continue
    const recordDate = new Date(r.date)
    const current = lastDateByBp.get(bp)
    if (!current || recordDate > current) {
      lastDateByBp.set(bp, recordDate)
    }
  }

  // 経過日数（floor）に変換
  for (const [bp, lastDate] of lastDateByBp) {
    const diffMs = now.getTime() - lastDate.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    result.set(bp, diffDays)
  }

  return result
}

/** 「◯日前」表記。0/1日前は「昨日」と表記（今日のセッションも実質昨日扱い）。 */
function formatDaysAgo(days: number): string {
  return days <= 1 ? '昨日' : `${days}日前`
}

/**
 * 履歴とコースから、今日の推薦フォーカスを決定する。
 *
 * ロジック:
 *  1. 履歴ゼロ → コース別の full をデフォルト
 *  2. 直近1週間に1件もなし → full（再開促進）
 *  3. 直近1日以内（=今日/昨日）に鍛えた部位は避ける
 *  4. 引き締めコース: 脚を強めにバイアス
 *  5. 筋肥大コース: 部位バランスを優先
 */
export function recommendTodaysFocus(
  records: WorkoutRecord[],
  course: CourseType,
  now: Date = new Date(),
): TodaysRecommendation {
  // 1. 履歴ゼロ
  if (records.length === 0) {
    if (course === 'toning') {
      return { toningPreset: 'full', reason: 'まずは全身バランスから始めましょう' }
    }
    return { hypertrophyFocus: 'full', reason: 'まずは全身バランスから始めましょう' }
  }

  // 2. 直近1週間に何もなし
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentRecords = records.filter(r => new Date(r.date) >= sevenDaysAgo)
  if (recentRecords.length === 0) {
    if (course === 'toning') {
      return { toningPreset: 'full', reason: '前回から1週間ぶり。全身バランスで再開しましょう' }
    }
    return { hypertrophyFocus: 'full', reason: '前回から1週間ぶり。全身バランスで再開しましょう' }
  }

  const daysSince = computeDaysSinceLastTraining(records, now)

  if (course === 'toning') {
    return recommendForToning(daysSince)
  }
  return recommendForHypertrophy(daysSince)
}

function recommendForToning(
  daysSince: Map<BodyPart, number | null>,
): TodaysRecommendation {
  const legsDays = daysSince.get('legs') ?? null
  const isLegsRecent = legsDays !== null && legsDays <= 1

  // 脚が直近（0/1日前）→ 上半身でリカバリー
  if (isLegsRecent) {
    return {
      toningPreset: 'upper',
      reason: `${formatDaysAgo(legsDays!)}は脚でした。今日は背中・肩・二の腕を`,
    }
  }

  // 脚が一度もない → まず脚から（引き締めバイアス）
  if (legsDays === null) {
    return { toningPreset: 'lower', reason: 'まずはお尻・脚から始めましょう' }
  }

  // 脚から2日以上経過 → 脚を再度推薦
  if (legsDays >= 2) {
    return {
      toningPreset: 'lower',
      reason: `${legsDays}日前に脚を鍛えました。お尻・脚を中心に`,
    }
  }

  // フォールバック（基本ここに来ない）
  return { toningPreset: 'full', reason: 'バランスよく全身を鍛えましょう' }
}

function recommendForHypertrophy(
  daysSince: Map<BodyPart, number | null>,
): TodaysRecommendation {
  const legsDays = daysSince.get('legs') ?? null
  const isLegsRecent = legsDays !== null && legsDays <= 1

  const upperBodyParts: BodyPart[] = ['back', 'chest', 'shoulders']
  const upperDays = upperBodyParts.map(bp => daysSince.get(bp) ?? null)
  const isUpperRecent = upperDays.every(d => d !== null && d <= 1)

  // 脚が直近 && 上半身は問題なし → 上半身
  if (isLegsRecent && !isUpperRecent) {
    return {
      hypertrophyFocus: 'upper',
      reason: `${formatDaysAgo(legsDays!)}は脚でした。今日は上半身を`,
    }
  }

  // 上半身が直近 && 脚は問題なし → 下半身
  if (isUpperRecent && !isLegsRecent) {
    const numericUpperDays = upperDays.filter((d): d is number => d !== null)
    const oldestUpperDay = numericUpperDays.length > 0 ? Math.min(...numericUpperDays) : 1
    return {
      hypertrophyFocus: 'lower',
      reason: `${formatDaysAgo(oldestUpperDay)}は上半身でした。今日は脚を`,
    }
  }

  // 一度もやっていない部位がある場合、それを優先
  const untrained: BodyPart[] = []
  for (const [bp, days] of daysSince) {
    if (days === null) untrained.push(bp)
  }
  if (untrained.length > 0) {
    if (untrained.some(bp => upperBodyParts.includes(bp))) {
      return { hypertrophyFocus: 'upper', reason: 'まだ鍛えていない部位を中心に' }
    }
    if (untrained.includes('legs')) {
      return { hypertrophyFocus: 'lower', reason: 'まだ鍛えていない脚を中心に' }
    }
  }

  // 全部位を直近2日以内にやっている等の特殊ケース → full
  return { hypertrophyFocus: 'full', reason: 'バランスよく全身を鍛えましょう' }
}
