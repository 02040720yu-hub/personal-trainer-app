import { describe, it, expect } from 'vitest'
import type { WorkoutRecord } from '../types'
import {
  toDateKey,
  getVolumeLevel,
  aggregateVolumeByDay,
  buildMonthlyHeatmap,
  calcHeatmapStats,
} from './heatmap'

// ── ヘルパー ─────────────────────────────────────────────────────────────────

function makeRecord(
  exerciseId: string,
  date: string,
  sets: Array<{ weight: number; reps: number }>,
): WorkoutRecord {
  return { id: `${exerciseId}-${date}`, exerciseId, date, sets, best1RM: 0, nextTargetWeight: 0 }
}

// ── toDateKey ─────────────────────────────────────────────────────────────────

describe('toDateKey', () => {
  it('YYYY-MM-DD 形式を返す', () => {
    expect(toDateKey(new Date(2024, 3, 1))).toBe('2024-04-01')
  })

  it('月・日が 1 桁のとき 0 埋めする', () => {
    expect(toDateKey(new Date(2024, 0, 5))).toBe('2024-01-05')
  })
})

// ── getVolumeLevel ─────────────────────────────────────────────────────────

describe('getVolumeLevel', () => {
  it('0 → level 0', () => expect(getVolumeLevel(0)).toBe(0))
  it('負値 → level 0', () => expect(getVolumeLevel(-1)).toBe(0))
  it('1 → level 1', () => expect(getVolumeLevel(1)).toBe(1))
  it('2499 → level 1', () => expect(getVolumeLevel(2499)).toBe(1))
  it('2500 → level 2', () => expect(getVolumeLevel(2500)).toBe(2))
  it('4999 → level 2', () => expect(getVolumeLevel(4999)).toBe(2))
  it('5000 → level 3', () => expect(getVolumeLevel(5000)).toBe(3))
  it('9999 → level 3', () => expect(getVolumeLevel(9999)).toBe(3))
  it('10000 → level 4', () => expect(getVolumeLevel(10000)).toBe(4))
  it('99999 → level 4', () => expect(getVolumeLevel(99999)).toBe(4))
})

// ── aggregateVolumeByDay ──────────────────────────────────────────────────

describe('aggregateVolumeByDay', () => {
  it('空レコードは空 Map', () => {
    expect(aggregateVolumeByDay([])).toHaveProperty('size', 0)
  })

  it('同日の複数レコードを合算する', () => {
    const records: WorkoutRecord[] = [
      makeRecord('bench', '2024-04-01T10:00:00.000Z', [{ weight: 100, reps: 10 }]), // 1000
      makeRecord('squat', '2024-04-01T11:00:00.000Z', [{ weight: 50, reps: 20 }]),  // 1000
    ]
    const map = aggregateVolumeByDay(records)
    // キーはローカル時刻の日付なのでシステムTZ依存。値の合計で検証
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0)
    expect(total).toBe(2000)
  })

  it('セットごとに weight × reps を加算する', () => {
    const records: WorkoutRecord[] = [
      makeRecord('bench', '2024-04-02T10:00:00.000Z', [
        { weight: 60, reps: 10 }, // 600
        { weight: 60, reps: 8 },  // 480
      ]),
    ]
    const map = aggregateVolumeByDay(records)
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0)
    expect(total).toBe(1080)
  })
})

// ── buildMonthlyHeatmap ──────────────────────────────────────────────────────

describe('buildMonthlyHeatmap', () => {
  it('months 個の MonthData を返す', () => {
    expect(buildMonthlyHeatmap([], 3)).toHaveLength(3)
    expect(buildMonthlyHeatmap([], 6)).toHaveLength(6)
  })

  it('空レコードなら全日 level = 0, volume = 0', () => {
    const result = buildMonthlyHeatmap([], 2)
    for (const m of result) {
      for (const d of m.days) {
        expect(d.level).toBe(0)
        expect(d.volume).toBe(0)
      }
    }
  })

  it('各月の days 数が正しい（その月の日数と一致）', () => {
    const result = buildMonthlyHeatmap([], 6)
    for (const m of result) {
      const daysInMonth = new Date(m.year, m.month + 1, 0).getDate()
      expect(m.days).toHaveLength(daysInMonth)
    }
  })

  it('startPad は 0〜6 の範囲', () => {
    const result = buildMonthlyHeatmap([], 12)
    for (const m of result) {
      expect(m.startPad).toBeGreaterThanOrEqual(0)
      expect(m.startPad).toBeLessThanOrEqual(6)
    }
  })

  it('最新月が末尾に来る', () => {
    const now = new Date()
    const result = buildMonthlyHeatmap([], 3)
    const last = result[result.length - 1]
    expect(last.year).toBe(now.getFullYear())
    expect(last.month).toBe(now.getMonth())
  })

  it('最古月が先頭に来る', () => {
    const now = new Date()
    const result = buildMonthlyHeatmap([], 3)
    const first = result[0]
    const expected = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    expect(first.year).toBe(expected.getFullYear())
    expect(first.month).toBe(expected.getMonth())
  })

  it('今日のレコードが正しく反映される', () => {
    const today = new Date()
    const iso = today.toISOString()
    const records: WorkoutRecord[] = [
      makeRecord('bench', iso, [{ weight: 100, reps: 10 }]), // 1000 kg
      makeRecord('squat', iso, [{ weight: 150, reps: 10 }]), // 1500 kg → 合計 2500 → level 2
    ]
    const result = buildMonthlyHeatmap(records, 1)
    const lastMonth = result[result.length - 1]
    const todayEntry = lastMonth.days.find(d => d.date.getDate() === today.getDate())
    expect(todayEntry?.volume).toBe(2500)
    expect(todayEntry?.level).toBe(2)
  })

  it('label が「YYYY年M月」形式', () => {
    const result = buildMonthlyHeatmap([], 1)
    expect(result[0].label).toMatch(/^\d{4}年\d{1,2}月$/)
  })
})

// ── calcHeatmapStats ──────────────────────────────────────────────────────────

describe('calcHeatmapStats', () => {
  it('空データは全て 0', () => {
    const months = buildMonthlyHeatmap([], 1)
    const stats = calcHeatmapStats(months)
    expect(stats.totalVolume).toBe(0)
    expect(stats.activeDays).toBe(0)
    expect(stats.maxDayVolume).toBe(0)
  })

  it('activeDays は level > 0 の日数', () => {
    const today = new Date()
    const records: WorkoutRecord[] = [
      makeRecord('bench', today.toISOString(), [{ weight: 100, reps: 5 }]),
    ]
    const months = buildMonthlyHeatmap(records, 1)
    const stats = calcHeatmapStats(months)
    expect(stats.activeDays).toBe(1)
    expect(stats.totalVolume).toBe(500)
    expect(stats.maxDayVolume).toBe(500)
  })

  it('totalDays は months 内の全日数', () => {
    const months = buildMonthlyHeatmap([], 1)
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    expect(calcHeatmapStats(months).totalDays).toBe(daysInMonth)
  })
})
