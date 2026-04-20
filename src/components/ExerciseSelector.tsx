import { useState, useMemo } from 'react'
import type { BodyPart, Exercise } from '../types'
import { BODY_PARTS, getExercisesByBodyPart } from '../data/exercises'
import { getLastRecordForExercise } from '../lib/storage'

interface Props {
  bodyPart: BodyPart
  onSelect: (exercise: Exercise) => void
  onBack: () => void
}

export default function ExerciseSelector({ bodyPart, onSelect, onBack }: Props) {
  const [search, setSearch] = useState('')
  const bodyPartInfo = BODY_PARTS.find(bp => bp.id === bodyPart)!
  const exercises = getExercisesByBodyPart(bodyPart)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q)
    )
  }, [exercises, search])

  return (
    <div className="flex flex-col min-h-screen bg-sky-50">

      {/* スティッキーヘッダー */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-sky-100 px-4 pt-safe pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800
            font-medium transition-colors mb-3 -ml-1 rounded-lg px-1 py-1
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          ← 部位選択に戻る
        </button>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {bodyPartInfo.emoji} {bodyPartInfo.label}の種目
        </h2>

        {/* 検索 */}
        <div className="mt-3 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 text-sm pointer-events-none"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="種目・器具で検索..."
            aria-label="種目を検索"
            className="w-full h-11 bg-sky-50 border border-sky-200 rounded-xl pl-9 pr-4 text-sm
              text-slate-900 placeholder-slate-400
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus:border-sky-400
              transition-shadow"
          />
        </div>
      </div>

      {/* 種目リスト */}
      <div className="flex-1 px-4 py-3 pb-8">
        {filtered.length === 0 ? (
          <EmptySearch query={search} />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(exercise => {
              const last = getLastRecordForExercise(exercise.id)
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => onSelect(exercise)}
                  className="bg-white border border-sky-100 hover:border-sky-300 shadow-sm hover:shadow-md
                    rounded-xl px-4 py-3.5 text-left transition-all duration-100
                    active:scale-[0.98] active:shadow-sm
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug text-slate-900">{exercise.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            exercise.category === 'compound'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {exercise.category === 'compound' ? '複合' : '単関節'}
                        </span>
                        <span className="text-xs text-slate-400">{exercise.equipment}</span>
                      </div>
                      {last && (
                        <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
                          前回 {last.sets[0]?.weight ?? '–'} kg × {last.sets[0]?.reps ?? '–'} 回
                          <span className="mx-1 text-slate-300">·</span>
                          1RM {last.best1RM.toFixed(1)} kg
                        </p>
                      )}
                    </div>
                    <span className="text-sky-300 text-base shrink-0" aria-hidden="true">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

function EmptySearch({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8 animate-fade-up">
      <div className="w-14 h-14 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl" role="img" aria-hidden="true">🔍</span>
      </div>
      <p className="font-semibold text-slate-700 text-sm">種目が見つかりません</p>
      {query && (
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          「{query}」に一致する種目はありませんでした
          <br />
          別のキーワードで検索してみてください
        </p>
      )}
    </div>
  )
}
