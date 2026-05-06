import { useState, useMemo } from 'react'
import { getAllRecords, deleteRecord } from '../lib/storage'
import { getExerciseById } from '../data/exercises'
import type { WorkoutRecord } from '../types'

interface Props {
  onBack: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return '今日'
  if (d.toDateString() === yesterday.toDateString()) return '昨日'
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })
}

export default function WorkoutHistory({ onBack }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [, forceUpdate] = useState(0)

  const allRecords = getAllRecords()

  const groups = useMemo(() => {
    const map = new Map<string, WorkoutRecord[]>()
    allRecords.forEach(r => {
      const list = map.get(r.exerciseId) ?? []
      list.push(r)
      map.set(r.exerciseId, list)
    })

    return Array.from(map.entries())
      .map(([exerciseId, records]) => {
        const sorted = [...records].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        return {
          exerciseId,
          exercise: getExerciseById(exerciseId),
          records: sorted,
          lastRecord: sorted[0],
          count: sorted.length,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.lastRecord.date).getTime() - new Date(a.lastRecord.date).getTime()
      )
  }, [allRecords, forceUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (recordId: string) => {
    if (!window.confirm('この記録を削除しますか？')) return
    deleteRecord(recordId)
    forceUpdate(n => n + 1)
  }

  const totalSessions = allRecords.length

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">

      {/* スティッキーヘッダー */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-white/10 px-4 pt-safe pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300
            font-medium transition-colors mb-3 -ml-1 rounded-lg px-1 py-1
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          ← ホームへ
        </button>
        <h2 className="text-xl font-bold tracking-tight text-white">ワークアウト履歴</h2>
        <p className="text-slate-500 text-xs mt-0.5 tabular-nums">
          {totalSessions} セッション · {groups.length} 種目
        </p>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 px-4 py-3 pb-8">
        {groups.length === 0 ? (
          <EmptyHistory onBack={onBack} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {groups.map(group => (
              <div
                key={group.exerciseId}
                className="bg-slate-900 border border-white/10 rounded-xl shadow-sm overflow-hidden"
              >
                {/* 種目ヘッダー（タップで展開） */}
                <button
                  type="button"
                  className="w-full px-4 py-4 flex items-center gap-3 text-left
                    hover:bg-slate-800/60 active:bg-slate-800 transition-colors duration-100
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-inset"
                  onClick={() =>
                    setExpandedId(
                      expandedId === group.exerciseId ? null : group.exerciseId
                    )
                  }
                  aria-expanded={expandedId === group.exerciseId}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-snug truncate text-white">
                      {group.exercise?.name ?? group.exerciseId}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {group.count} 回実施 · {formatDate(group.lastRecord.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-cyan-400 tabular-nums">
                      {group.lastRecord.best1RM.toFixed(1)} kg
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">推定 1RM</p>
                  </div>
                  <span className="text-slate-600 text-xs ml-1 shrink-0" aria-hidden="true">
                    {expandedId === group.exerciseId ? '▲' : '▼'}
                  </span>
                </button>

                {/* 展開: 過去のセッション一覧 */}
                {expandedId === group.exerciseId && (
                  <div className="border-t border-white/10">
                    {group.records.slice(0, 10).map(record => (
                      <div
                        key={record.id}
                        className="px-4 py-3 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-400">
                            {formatDate(record.date)}
                            <span className="text-slate-600 ml-1.5 tabular-nums">
                              {new Date(record.date).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-cyan-400 tabular-nums">
                              {record.best1RM.toFixed(1)} kg
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(record.id)}
                              aria-label="この記録を削除"
                              className="w-7 h-7 flex items-center justify-center rounded-lg
                                text-slate-500 hover:text-rose-400 hover:bg-rose-500/10
                                transition-colors
                                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {record.sets.map((s, i) => (
                            <span
                              key={i}
                              className="text-xs bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-slate-300 tabular-nums"
                            >
                              {s.weight} kg × {s.reps}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                          次回目標: {record.nextTargetWeight} kg × {record.courseType === 'hypertrophy' ? 8 : 10}
                        </p>
                      </div>
                    ))}
                    {group.records.length > 10 && (
                      <p className="text-center text-xs text-slate-500 py-3">
                        最新 10 件を表示中
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ── 空状態 ────────────────────────────────────────────────────────────────────

function EmptyHistory({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8 animate-fade-up">
      <div className="w-16 h-16 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center mb-5">
        <span className="text-3xl" role="img" aria-hidden="true">📊</span>
      </div>
      <p className="font-semibold text-slate-200 text-sm">まだ記録がありません</p>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        ワークアウトを記録すると
        <br />
        ここに履歴が表示されます
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 h-11 px-6 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 active:scale-[0.97]
          text-white text-sm font-semibold rounded-xl transition-all
          shadow-lg shadow-cyan-500/25
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        記録を始める
      </button>
    </div>
  )
}
