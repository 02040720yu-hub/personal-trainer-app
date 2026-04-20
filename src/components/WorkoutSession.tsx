import { useState } from 'react'
import type { Exercise, WorkoutRecord, WorkoutSet } from '../types'
import { getProfile, getAllRecords, getLastRecordForExercise, saveRecord } from '../lib/storage'
import { checkPR } from '../lib/analytics'
import {
  calculateInitialTargetWeight,
  getBest1RM,
  calculate10RMTarget,
  roundToNearestPlate,
  calculate1RM,
} from '../lib/calculations'

interface Props {
  exercise: Exercise
  onBack: () => void
  onHome: () => void
}

export default function WorkoutSession({ exercise, onBack, onHome }: Props) {
  const profile = getProfile()!
  const lastRecord = getLastRecordForExercise(exercise.id)
  const isFirstTime = lastRecord === null

  const targetWeight = isFirstTime
    ? calculateInitialTargetWeight(exercise.id, profile.weight, profile.gender, exercise.category)
    : roundToNearestPlate(lastRecord.nextTargetWeight)

  const defaultWeight = targetWeight > 0 ? targetWeight : 20

  const [sets, setSets] = useState<WorkoutSet[]>([
    { weight: defaultWeight, reps: 10 },
    { weight: defaultWeight, reps: 10 },
    { weight: defaultWeight, reps: 10 },
  ])
  const [completed, setCompleted] = useState(false)
  const [savedRecord, setSavedRecord] = useState<WorkoutRecord | null>(null)
  const [prResult, setPRResult] = useState<{ weightPR: boolean; onermPR: boolean } | null>(null)

  const updateSet = (index: number, updated: WorkoutSet) =>
    setSets(prev => prev.map((s, i) => (i === index ? updated : s)))

  const addSet = () =>
    setSets(prev => [...prev, { ...prev[prev.length - 1] }])

  const removeSet = (index: number) => {
    if (sets.length <= 1) return
    setSets(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    const valid = sets.filter(s => s.weight > 0 && s.reps > 0)
    if (valid.length === 0) return

    // PR チェックは保存前に既存レコードと比較
    const existingRecords = getAllRecords()

    const best1RM = parseFloat(getBest1RM(valid).toFixed(1))
    const nextTarget = roundToNearestPlate(calculate10RMTarget(best1RM))

    const record: WorkoutRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      exerciseId: exercise.id,
      date: new Date().toISOString(),
      sets: valid,
      best1RM,
      nextTargetWeight: nextTarget,
    }

    const pr = checkPR(record, existingRecords)
    saveRecord(record)
    setSavedRecord(record)
    setPRResult(pr)
    setCompleted(true)
  }

  // ── 完了画面 ────────────────────────────────────────────────────────────────
  if (completed && savedRecord) {
    const isPR = prResult && (prResult.weightPR || prResult.onermPR)

    return (
      <div className="flex flex-col min-h-screen px-4 pt-safe bg-sky-50 animate-fade-up">
        <div className="flex-1 flex flex-col justify-center gap-5">

          {/* 完了アイコン */}
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl" role="img" aria-label="完了">✅</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">記録完了！</h2>
            <p className="text-slate-500 text-sm mt-1.5">{exercise.name}</p>
          </div>

          {/* PR バッジ */}
          {isPR && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
              <span className="text-2xl" role="img" aria-label="トロフィー">🏆</span>
              <div>
                <p className="text-sm font-bold text-amber-700">自己ベスト更新！</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {[
                    prResult.onermPR && '推定 1RM',
                    prResult.weightPR && '最大重量',
                  ].filter(Boolean).join(' と ')}
                  の新記録です
                </p>
              </div>
            </div>
          )}

          {/* 1RM・次回目標 */}
          <div className="bg-white border border-sky-100 rounded-2xl shadow-sm divide-y divide-sky-100">
            <div className="px-5 py-4">
              <p className="label-xs mb-1.5">推定 1RM</p>
              <p className="text-3xl font-bold text-sky-600 tabular-nums leading-none">
                {savedRecord.best1RM.toFixed(1)}
                <span className="text-lg font-semibold text-sky-400 ml-1">kg</span>
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="label-xs mb-1.5">次回の目標</p>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums leading-none">
                {savedRecord.nextTargetWeight}
                <span className="text-base font-semibold text-emerald-400 ml-1">kg × 10</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">Epley 式による推定値（目安です）</p>
            </div>
          </div>

          {/* セット一覧 */}
          <div className="bg-white border border-sky-100 rounded-xl shadow-sm">
            <p className="label-xs px-4 py-3 border-b border-sky-100">今日のセット</p>
            {savedRecord.sets.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3
                  border-b border-sky-50 last:border-0 text-sm"
              >
                <span className="text-slate-500">セット {i + 1}</span>
                <span className="font-semibold tabular-nums text-slate-900">{s.weight} kg × {s.reps} 回</span>
              </div>
            ))}
          </div>

        </div>

        {/* アクションボタン */}
        <div className="flex flex-col gap-2.5 py-5 pb-safe">
          <button
            type="button"
            onClick={onBack}
            className="w-full h-14 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 active:scale-[0.98]
              text-white text-base font-bold rounded-xl transition-all
              shadow-lg shadow-sky-500/25
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50"
          >
            別の種目を記録
          </button>
          <button
            type="button"
            onClick={onHome}
            className="w-full h-14 bg-white hover:bg-sky-50 active:bg-sky-100 active:scale-[0.98]
              text-slate-600 text-sm font-semibold rounded-xl transition-all
              border border-sky-200 hover:border-sky-300
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            ホームへ
          </button>
        </div>
      </div>
    )
  }

  // ── 記録画面 ────────────────────────────────────────────────────────────────
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
          ← 種目選択に戻る
        </button>
        <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900">{exercise.name}</h2>
        <p className="text-slate-400 text-xs mt-0.5">{exercise.equipment}</p>
      </div>

      {/* スクロールコンテンツ */}
      <div className="flex-1 px-4 pt-4 pb-32 overflow-y-auto">

        {/* 目標カード */}
        <div className="bg-white border border-sky-100 rounded-2xl shadow-sm p-5 mb-5">
          <p className="label-xs mb-3">
            {isFirstTime ? '初回目安' : '今日の目標'}
          </p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-5xl font-bold text-sky-600 tabular-nums leading-none">
              {targetWeight}
            </span>
            <span className="text-slate-400 text-lg mb-0.5">kg × 10</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isFirstTime
              ? '体重・性別から算出した初回目安です。無理のない範囲で始めてください。'
              : '前回の記録から Epley 式で算出した目標値です。'}
          </p>

          {lastRecord && (
            <div className="mt-3 pt-3 border-t border-sky-50 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                前回: {new Date(lastRecord.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-slate-500 tabular-nums">1RM ≈ {lastRecord.best1RM.toFixed(1)} kg</span>
            </div>
          )}

          {exercise.isBodyweight && (
            <p className="text-xs text-sky-600 mt-3 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 leading-relaxed">
              自重種目：加重なしの場合は体重（{profile.weight} kg）を入力してください
            </p>
          )}
        </div>

        {/* セット入力 */}
        <p className="label-xs mb-3">セット記録</p>
        <div className="flex flex-col gap-3 mb-4">
          {sets.map((set, index) => (
            <SetRow
              key={index}
              set={set}
              index={index}
              onChange={updated => updateSet(index, updated)}
              onRemove={() => removeSet(index)}
              canRemove={sets.length > 1}
            />
          ))}
        </div>

        {/* セット追加 */}
        <button
          type="button"
          onClick={addSet}
          className="w-full h-12 border border-dashed border-sky-300
            hover:border-sky-400 text-sky-500 hover:text-sky-600 hover:bg-sky-50
            rounded-xl text-sm font-medium transition-all duration-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          + セットを追加
        </button>

      </div>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 bg-white/95 backdrop-blur-sm border-t border-sky-100 pb-safe">
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-14 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 active:scale-[0.98]
              text-white text-base font-bold rounded-xl transition-all
              shadow-xl shadow-sky-500/25
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            記録する
          </button>
        </div>
      </div>

    </div>
  )
}

// ── SetRow ────────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: WorkoutSet
  index: number
  onChange: (s: WorkoutSet) => void
  onRemove: () => void
  canRemove: boolean
}

function SetRow({ set, index, onChange, onRemove, canRemove }: SetRowProps) {
  const adjustWeight = (delta: number) => {
    const v = Math.max(0, parseFloat((set.weight + delta).toFixed(1)))
    onChange({ ...set, weight: v })
  }
  const adjustReps = (delta: number) => {
    const v = Math.max(1, set.reps + delta)
    onChange({ ...set, reps: v })
  }

  const est1RM =
    set.weight > 0 && set.reps > 0
      ? calculate1RM(set.weight, set.reps).toFixed(1)
      : null

  return (
    <div className="bg-white border border-sky-100 rounded-xl shadow-sm p-4">

      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="label-xs">セット {index + 1}</span>
        <div className="flex items-center gap-3">
          {est1RM && (
            <span className="text-xs text-slate-400 tabular-nums">1RM ≈ {est1RM} kg</span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`セット ${index + 1} を削除`}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-xs
                text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 重量 */}
      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-1.5">重量</p>
        <div className="flex items-center gap-1.5">
          <AdjBtn label="-5"   onClick={() => adjustWeight(-5)} />
          <AdjBtn label="-2.5" onClick={() => adjustWeight(-2.5)} wide />
          <input
            type="number"
            value={set.weight}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v >= 0) onChange({ ...set, weight: v })
            }}
            inputMode="decimal"
            aria-label={`セット ${index + 1} の重量`}
            className="flex-1 min-w-0 h-11 bg-sky-50 border border-sky-200 rounded-lg
              text-center text-lg font-bold tabular-nums text-slate-900
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus:border-sky-400"
          />
          <AdjBtn label="+2.5" onClick={() => adjustWeight(2.5)} wide />
          <AdjBtn label="+5"   onClick={() => adjustWeight(5)} />
          <span className="text-xs text-slate-400 w-5 text-center shrink-0">kg</span>
        </div>
      </div>

      {/* 回数 */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">回数</p>
        <div className="flex items-center gap-1.5">
          <AdjBtn label="−" onClick={() => adjustReps(-1)} wide />
          <input
            type="number"
            value={set.reps}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1) onChange({ ...set, reps: v })
            }}
            inputMode="numeric"
            aria-label={`セット ${index + 1} の回数`}
            className="flex-1 min-w-0 h-11 bg-sky-50 border border-sky-200 rounded-lg
              text-center text-lg font-bold tabular-nums text-slate-900
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus:border-sky-400"
          />
          <AdjBtn label="＋" onClick={() => adjustReps(1)} wide />
          <span className="text-xs text-slate-400 w-5 text-center shrink-0">回</span>
        </div>
      </div>

    </div>
  )
}

// ── AdjBtn ────────────────────────────────────────────────────────────────────

function AdjBtn({
  label, onClick, wide,
}: {
  label: string; onClick: () => void; wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${wide ? 'w-11' : 'w-9'} h-11
        bg-sky-50 hover:bg-sky-100 active:bg-sky-200 active:scale-[0.94]
        border border-sky-200 hover:border-sky-300
        rounded-lg text-xs font-bold text-slate-700
        transition-all duration-75 shrink-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500`}
    >
      {label}
    </button>
  )
}
