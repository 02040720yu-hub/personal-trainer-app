/**
 * heatmap.ts
 * 活動カレンダー用の集計ロジック（純粋関数）
 *
 * 強度定義: その日の総ボリューム Σ(weight × reps) [kg]
 * 濃淡閾値:
 *   level 0: 0 kg          (未トレ)
 *   level 1: 1〜2,499 kg   (軽め)
 *   level 2: 2,500〜4,999 kg (中程度)
 *   level 3: 5,000〜9,999 kg (ハード)
 *   level 4: 10,000 kg 以上  (超ハード)
 */

import type { WorkoutRecord } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

export type IntensityLevel = 0 | 1 | 2 | 3 | 4

export interface DayData {
  date: Date
  /** 'YYYY-MM-DD' 形式 */
  dateKey: string
  /** Σ(weight × reps) の日次合計 [kg] */
  volume: number
  /** 強度レベル 0〜4 */
  level: IntensityLevel
}

export interface MonthData {
  year: number
  /** 0-indexed (0=1月 … 11=12月) */
  month: number
  /** 表示ラベル（例: '2024年4月'） */
  label: string
  days: DayData[]
  /** 月の1日が何列目から始まるか（月曜起点: 月=0, 火=1 … 日=6） */
  startPad: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────────────────

/** ボリューム閾値 [level1下限, level2下限, level3下限, level4下限] */
export const VOLUME_THRESHOLDS = [1, 2500, 5000, 10000] as const

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

// ─────────────────────────────────────────────────────────────────────────────
// 純粋関数
// ─────────────────────────────────────────────────────────────────────────────

/** Date → 'YYYY-MM-DD' */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** ボリューム値から強度レベルを返す */
export function getVolumeLevel(volume: number): IntensityLevel {
  if (volume <= 0)     return 0
  if (volume < 2500)   return 1
  if (volume < 5000)   return 2
  if (volume < 10000)  return 3
  return 4
}

/**
 * レコードを日付ごとのボリュームに集計する（Map<dateKey, volume>）
 */
export function aggregateVolumeByDay(records: WorkoutRecord[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of records) {
    const key = toDateKey(new Date(r.date))
    const vol = r.sets.reduce((acc, s) => acc + s.weight * s.reps, 0)
    map.set(key, (map.get(key) ?? 0) + vol)
  }
  return map
}

/**
 * 直近 months ヶ月分の MonthData 配列を生成する。
 * 先頭が最も古い月、末尾が今月。
 */
export function buildMonthlyHeatmap(
  records: WorkoutRecord[],
  months: number,
): MonthData[] {
  const volumeByDay = aggregateVolumeByDay(records)
  const now = new Date()
  const result: MonthData[] = []

  for (let i = months - 1; i >= 0; i--) {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year  = first.getFullYear()
    const month = first.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // 月曜起点のオフセット: Sunday(0)→6, Monday(1)→0, …Saturday(6)→5
    const raw = first.getDay()
    const startPad: number = raw === 0 ? 6 : raw - 1

    const days: DayData[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date    = new Date(year, month, day)
      const dateKey = toDateKey(date)
      const volume  = volumeByDay.get(dateKey) ?? 0
      days.push({ date, dateKey, volume, level: getVolumeLevel(volume) })
    }

    result.push({
      year,
      month,
      label: `${year}年${MONTH_LABELS[month]}`,
      days,
      startPad,
    })
  }

  return result
}

/**
 * MonthData 配列からサマリー統計を返す
 */
export function calcHeatmapStats(monthData: MonthData[]): {
  totalDays: number
  totalVolume: number
  maxDayVolume: number
  activeDays: number
} {
  let totalVolume = 0
  let maxDayVolume = 0
  let activeDays = 0
  let totalDays = 0

  for (const m of monthData) {
    for (const d of m.days) {
      totalDays++
      totalVolume += d.volume
      if (d.volume > maxDayVolume) maxDayVolume = d.volume
      if (d.level > 0) activeDays++
    }
  }

  return { totalDays, totalVolume, maxDayVolume, activeDays }
}
