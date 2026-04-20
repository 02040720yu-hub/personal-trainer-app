/**
 * CSV エクスポート
 * 形式: 1行 = 1セット
 * 列: date, exerciseId, exerciseName, setIndex, weight_kg, reps, best1RM_kg, nextTargetWeight_kg
 */

import type { WorkoutRecord } from '../types'
import { getExerciseById } from '../data/exercises'

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function exportToCsv(records: WorkoutRecord[]): void {
  const header = [
    'date',
    'exerciseId',
    'exerciseName',
    'setIndex',
    'weight_kg',
    'reps',
    'best1RM_kg',
    'nextTargetWeight_kg',
  ]

  const rows: string[][] = []

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  sorted.forEach(r => {
    const ex = getExerciseById(r.exerciseId)
    const dateStr = new Date(r.date).toLocaleDateString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    r.sets.forEach((set, i) => {
      rows.push([
        dateStr,
        r.exerciseId,
        ex?.name ?? r.exerciseId,
        String(i + 1),
        String(set.weight),
        String(set.reps),
        String(r.best1RM),
        String(r.nextTargetWeight),
      ])
    })
  })

  const csv =
    [header, ...rows]
      .map(row => row.map(escapeCsv).join(','))
      .join('\r\n')

  // UTF-8 BOM 付きで Excel でも文字化けしないようにする
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workout_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
