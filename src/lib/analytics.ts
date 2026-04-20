/**
 * analytics.ts — 純粋関数の分析ロジック
 *
 * 定義まとめ:
 *   - 週の境界  : 月曜 00:00 ローカル時刻
 *   - ストリーク: 今日トレ済み → 今日含む / 今日未トレ → 昨日から遡る
 *   - 部位別回数: レコード数（セット数ではなくセッション単位）
 *   - 週代表重量: 週内全セットの最大重量
 *   - 10RM目標 : 週内最新レコードの nextTargetWeight
 *   - ボリューム: Σ(weight × reps)
 */

import type { WorkoutRecord } from '../types'
import { getExerciseById } from '../data/exercises'

// ── 日付ユーティリティ ─────────────────────────────────────────────────────

/** 月曜始まりの週開始日（ローカル 00:00:00）を返す */
export function getWeekStart(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() // 0=日, 1=月…6=土
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

/** 月の 1 日 00:00:00 を返す */
export function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** [start, end) でレコードをフィルタ */
export function filterByRange(
  records: WorkoutRecord[],
  start: Date,
  end: Date
): WorkoutRecord[] {
  const s = start.getTime()
  const e = end.getTime()
  return records.filter(r => {
    const t = new Date(r.date).getTime()
    return t >= s && t < e
  })
}

// ── 基本集計 ───────────────────────────────────────────────────────────────

/** ユニークなトレ日数（カレンダー日） */
export function countUniqueDays(records: WorkoutRecord[]): number {
  return new Set(records.map(r => new Date(r.date).toDateString())).size
}

/** 全セット数合計 */
export function countTotalSets(records: WorkoutRecord[]): number {
  return records.reduce((s, r) => s + r.sets.length, 0)
}

/** 全レップ数合計 */
export function countTotalReps(records: WorkoutRecord[]): number {
  return records.reduce(
    (s, r) => s + r.sets.reduce((s2, set) => s2 + set.reps, 0),
    0
  )
}

/** 総ボリューム Σ(weight × reps) */
export function calcVolume(records: WorkoutRecord[]): number {
  return records.reduce(
    (sum, r) => sum + r.sets.reduce((s, set) => s + set.weight * set.reps, 0),
    0
  )
}

/** 部位別レコード数（セッション単位） */
export function countByBodyPart(records: WorkoutRecord[]): Map<string, number> {
  const map = new Map<string, number>()
  records.forEach(r => {
    const ex = getExerciseById(r.exerciseId)
    if (!ex) return
    map.set(ex.bodyPart, (map.get(ex.bodyPart) ?? 0) + 1)
  })
  return map
}

// ── ストリーク ─────────────────────────────────────────────────────────────

/**
 * 連続トレ日数
 * - 今日トレ済み → 今日も含めてカウント
 * - 今日未トレ  → 昨日から遡ってカウント（昨日もトレしていなければ 0）
 */
export function calcStreak(records: WorkoutRecord[]): number {
  if (records.length === 0) return 0

  const trained = new Set(
    records.map(r => {
      const d = new Date(r.date)
      return `${d.getFullYear()}/${d.getMonth()}/${d.getDate()}`
    })
  )

  const today = new Date()
  const todayKey = `${today.getFullYear()}/${today.getMonth()}/${today.getDate()}`

  const cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  if (!trained.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const key = `${cursor.getFullYear()}/${cursor.getMonth()}/${cursor.getDate()}`
    if (!trained.has(key)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** 今月のセッション数（レコード数） */
export function countThisMonthSessions(records: WorkoutRecord[]): number {
  const now = new Date()
  const start = getMonthStart(now)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return filterByRange(records, start, end).length
}

// ── 期間比較 ───────────────────────────────────────────────────────────────

export interface PeriodComparison {
  current:  number          // 今期のレコード数
  previous: number          // 前期のレコード数
  diff:     number
  pct:      number | null   // null = 前期データなし
}

/** 今週 vs 先週 / 今月 vs 先月のレコード数比較 */
export function comparePeriod(
  records: WorkoutRecord[],
  mode: 'week' | 'month'
): PeriodComparison {
  const now = new Date()
  let currStart: Date, prevStart: Date, currEnd: Date, prevEnd: Date

  if (mode === 'week') {
    currStart = getWeekStart(now)
    prevStart = new Date(currStart)
    prevStart.setDate(prevStart.getDate() - 7)
    currEnd = now
    prevEnd = currStart
  } else {
    currStart = getMonthStart(now)
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    currEnd = now
    prevEnd = currStart
  }

  const current  = filterByRange(records, currStart, currEnd).length
  const previous = filterByRange(records, prevStart, prevEnd).length
  const diff = current - previous
  const pct  = previous === 0 ? null : Math.round((diff / previous) * 100)

  return { current, previous, diff, pct }
}

// ── ボリューム比較 ─────────────────────────────────────────────────────────

export type VolumeLabel = 'heavy' | 'light' | 'same' | 'no-data'

export interface VolumeComparison {
  thisWeek: number
  lastWeek: number
  ratio:    number | null
  label:    VolumeLabel
}

/**
 * 今週 vs 先週のボリューム比較
 * ratio > 1.1 → 重め / ratio < 0.9 → 軽め / それ以外 → 同程度
 */
export function compareVolume(records: WorkoutRecord[]): VolumeComparison {
  const now = new Date()
  const thisStart = getWeekStart(now)
  const lastStart = new Date(thisStart)
  lastStart.setDate(lastStart.getDate() - 7)

  const thisWeek = calcVolume(filterByRange(records, thisStart, now))
  const lastWeek = calcVolume(filterByRange(records, lastStart, thisStart))

  if (lastWeek === 0) return { thisWeek, lastWeek, ratio: null, label: 'no-data' }

  const ratio = thisWeek / lastWeek
  const label: VolumeLabel =
    ratio > 1.1 ? 'heavy' : ratio < 0.9 ? 'light' : 'same'

  return { thisWeek, lastWeek, ratio, label }
}

// ── PR（自己ベスト）──────────────────────────────────────────────────────

export interface PRData {
  maxWeight: number  // セット内最大重量
  maxOneRM:  number  // best1RM 最大値
}

/** 種目ごとの自己ベスト（全レコードから算出） */
export function calcPRs(records: WorkoutRecord[]): Map<string, PRData> {
  const map = new Map<string, PRData>()
  records.forEach(r => {
    const maxW = Math.max(...r.sets.map(s => s.weight))
    const cur = map.get(r.exerciseId)
    map.set(r.exerciseId, {
      maxWeight: Math.max(maxW, cur?.maxWeight ?? 0),
      maxOneRM:  Math.max(r.best1RM, cur?.maxOneRM ?? 0),
    })
  })
  return map
}

/**
 * 新規レコードが PR かどうか判定
 * - existingRecords には新規レコードを含めない
 */
export function checkPR(
  newRecord: WorkoutRecord,
  existingRecords: WorkoutRecord[]
): { weightPR: boolean; onermPR: boolean } {
  const prev = existingRecords.filter(r => r.exerciseId === newRecord.exerciseId)
  if (prev.length === 0) return { weightPR: true, onermPR: true }

  const prevMaxWeight = Math.max(...prev.flatMap(r => r.sets.map(s => s.weight)))
  const prevMaxOneRM  = Math.max(...prev.map(r => r.best1RM))
  const newMaxWeight  = Math.max(...newRecord.sets.map(s => s.weight))

  return {
    weightPR: newMaxWeight > prevMaxWeight,
    onermPR:  newRecord.best1RM > prevMaxOneRM,
  }
}

// ── 週次推移 ───────────────────────────────────────────────────────────────

export interface WeeklyPoint {
  weekStart:  Date
  weekLabel:  string   // "4/7" 形式
  maxWeight:  number   // 週内全セット最大重量（hasData=false なら 0）
  maxOneRM:   number   // 週内最高 best1RM
  nextTarget: number   // 週内最新レコードの nextTargetWeight
  volume:     number   // Σ(weight × reps)
  hasData:    boolean
}

/** 直近 numWeeks 週の種目別週次集計データ */
export function getWeeklyPoints(
  records: WorkoutRecord[],
  exerciseId: string,
  numWeeks = 8
): WeeklyPoint[] {
  const now = new Date()
  const thisWeekStart = getWeekStart(now)

  return Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = new Date(thisWeekStart)
    weekStart.setDate(weekStart.getDate() - (numWeeks - 1 - i) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const wRec = records.filter(
      r =>
        r.exerciseId === exerciseId &&
        new Date(r.date).getTime() >= weekStart.getTime() &&
        new Date(r.date).getTime() < weekEnd.getTime()
    )

    const hasData = wRec.length > 0
    const maxWeight = hasData
      ? Math.max(...wRec.flatMap(r => r.sets.map(s => s.weight)))
      : 0
    const maxOneRM = hasData ? Math.max(...wRec.map(r => r.best1RM)) : 0
    const latest = hasData
      ? wRec.slice().sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]
      : null

    return {
      weekStart,
      weekLabel: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      maxWeight,
      maxOneRM,
      nextTarget: latest?.nextTargetWeight ?? 0,
      volume: wRec.reduce(
        (s, r) => s + r.sets.reduce((s2, set) => s2 + set.weight * set.reps, 0),
        0
      ),
      hasData,
    }
  })
}

/** 右肩上がり種目: 最初と最後のデータ点の 1RM 差分で判定 */
export function getTrendingExercises(
  records: WorkoutRecord[],
  numWeeks = 8
): Array<{ exerciseId: string; delta: number; latestOneRM: number }> {
  const ids = [...new Set(records.map(r => r.exerciseId))]

  return ids
    .map(id => {
      const pts = getWeeklyPoints(records, id, numWeeks).filter(p => p.hasData)
      if (pts.length < 2) return null
      const delta = pts[pts.length - 1].maxOneRM - pts[0].maxOneRM
      return { exerciseId: id, delta, latestOneRM: pts[pts.length - 1].maxOneRM }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
}

// ── カレンダーヒートマップ ─────────────────────────────────────────────────

export interface HeatDay {
  date:   Date
  count:  number   // レコード数（セッション数）
  volume: number   // Σ(weight × reps)
}

/** 直近 months ヶ月のヒートマップデータ（1日ずつ） */
export function buildHeatmap(records: WorkoutRecord[], months = 3): HeatDay[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

  const dayMap = new Map<string, HeatDay>()
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= now) {
    dayMap.set(cursor.toDateString(), { date: new Date(cursor), count: 0, volume: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  records.forEach(r => {
    const d = new Date(r.date)
    d.setHours(0, 0, 0, 0)
    const entry = dayMap.get(d.toDateString())
    if (entry) {
      entry.count++
      entry.volume += r.sets.reduce((s, set) => s + set.weight * set.reps, 0)
    }
  })

  return [...dayMap.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}
