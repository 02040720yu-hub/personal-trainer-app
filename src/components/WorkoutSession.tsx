import { useState } from 'react'
import type { Exercise, WorkoutRecord, WorkoutSet } from '../types'
import { getProfile, getAllRecords, getLastRecordForExercise, saveRecord } from '../lib/storage'
import { checkPR } from '../lib/analytics'
import {
  getBest1RM,
  getBestHistoricalOneRM,
  calcNextTarget,
  calculate10RMTarget,
  roundToNearestPlate,
  calculate1RM,
  calculateInitialTargetWeightForExercise,
} from '../lib/calculations'

interface Props {
  exercise: Exercise
  onBack: () => void
  onHome: () => void
}

type CourseType = 'hypertrophy' | 'toning'

type LocalSet = {
  weight: number | null
  reps: number | null
  isBodyweight: boolean
}

export default function WorkoutSession({ exercise, onBack, onHome }: Props) {
  const profile = getProfile()!
  const lastRecord = getLastRecordForExercise(exercise.id)

  const [courseType, setCourseType] = useState<CourseType>('hypertrophy')
  const [sets, setSets] = useState<LocalSet[]>([
    { weight: null, reps: null, isBodyweight: false },
    { weight: null, reps: null, isBodyweight: false },
    { weight: null, reps: null, isBodyweight: false },
  ])
  const [completed, setCompleted] = useState(false)
  const [savedRecord, setSavedRecord] = useState<WorkoutRecord | null>(null)
  const [prResult, setPRResult] = useState<{ weightPR: boolean; onermPR: boolean } | null>(null)

  const allRecords = getAllRecords()
  const bestOneRM = getBestHistoricalOneRM(exercise.id, allRecords)
  const isFirstTime = bestOneRM === 0

  const hint = isFirstTime
    ? {
        weight: calculateInitialTargetWeightForExercise(exercise, profile.weight, profile.gender),
        reps: courseType === 'hypertrophy' ? 8 : 10,
      }
    : calcNextTarget(bestOneRM, courseType)

  const updateSet = (index: number, updated: LocalSet) =>
    setSets(prev => prev.map((s, i) => (i === index ? updated : s)))

  const addSet = () =>
    setSets(prev => [...prev, { ...prev[prev.length - 1] }])

  const removeSet = (index: number) => {
    if (sets.length <= 1) return
    setSets(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    const valid: WorkoutSet[] = sets
      .filter(s => {
        if (s.isBodyweight) return s.reps !== null && s.reps > 0
        return s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0
      })
      .map(s => ({
        weight: s.isBodyweight ? profile.weight : s.weight!,
        reps: s.reps!,
        ...(s.isBodyweight ? { isBodyweight: true as const } : {}),
      }))

    if (valid.length === 0) return

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
      courseType,
    }

    const pr = checkPR(record, existingRecords)
    saveRecord(record)
    setSavedRecord(record)
    setPRResult(pr)
    setCompleted(true)
  }

  // ── 完了画面 ──────────────────────────────────────────────────────────────────
  if (completed && savedRecord) {
    const isPR = prResult && (prResult.weightPR || prResult.onermPR)

    return (
      <div className="flex flex-col min-h-screen px-4 pt-safe bg-slate-950 animate-fade-up">
        <div className="flex-1 flex flex-col justify-center gap-5">

          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl
              flex items-center justify-center mx-auto mb-5
              shadow-[0_0_24px_rgba(16,185,129,0.12)]">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M8 20L16 28L32 12" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">記録完了</h2>
            <p className="text-slate-400 text-sm mt-1.5">{exercise.name}</p>
          </div>

          {isPR && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3.5">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 4L17 10L24 11L19 16L20.5 23L14 20L7.5 23L9 16L4 11L11 10L14 4Z"
                  fill="#f59e0b" stroke="#d97706" strokeWidth="1.2"/>
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-400">自己ベスト更新</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  {[
                    prResult.onermPR && '推定 1RM',
                    prResult.weightPR && '最大重量',
                  ].filter(Boolean).join(' と ')}
                  の新記録です
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-white/10 rounded-2xl divide-y divide-white/10">
            <div className="px-5 py-4">
              <p className="label-xs mb-1.5">推定 1RM</p>
              <p className="text-3xl font-bold text-cyan-400 tabular-nums leading-none">
                {savedRecord.best1RM.toFixed(1)}
                <span className="text-lg font-semibold text-cyan-400/50 ml-1">kg</span>
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="label-xs mb-1.5">次回の目安</p>
              {(() => {
                const next = calcNextTarget(savedRecord.best1RM, courseType)
                return (
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums leading-none">
                    {next.weight}
                    <span className="text-base font-semibold text-emerald-400/50 ml-1">kg × {next.reps}回</span>
                  </p>
                )
              })()}
              <p className="text-xs text-slate-500 mt-1.5">自己ベスト1RMの80%（Epley式）</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl">
            <p className="label-xs px-4 py-3 border-b border-white/10">今日のセット</p>
            {savedRecord.sets.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3
                  border-b border-white/5 last:border-0 text-sm"
              >
                <span className="text-slate-500">セット {i + 1}</span>
                <span className="font-semibold tabular-nums text-white">
                  {s.isBodyweight ? '自重' : `${s.weight} kg`} × {s.reps} 回
                </span>
              </div>
            ))}
          </div>

        </div>

        <div className="flex flex-col gap-2.5 py-5 pb-safe">
          <button
            type="button"
            onClick={onBack}
            className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600
              hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]
              text-white text-base font-bold rounded-xl transition-all
              shadow-lg shadow-cyan-500/25
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            別の種目を記録
          </button>
          <button
            type="button"
            onClick={onHome}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 active:scale-[0.98]
              text-slate-300 text-sm font-semibold rounded-xl transition-all
              border border-white/10 hover:border-white/20
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            ホームへ
          </button>
        </div>
      </div>
    )
  }

  // ── 記録画面 ──────────────────────────────────────────────────────────────────
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
          ← 種目選択に戻る
        </button>
        <h2 className="text-xl font-bold leading-snug tracking-tight text-white">{exercise.name}</h2>
        <p className="text-slate-500 text-xs mt-0.5">{exercise.equipment}</p>
      </div>

      <div className="flex-1 px-4 pt-4 pb-32 overflow-y-auto">

        {/* コース選択タブ */}
        <div className="flex bg-slate-900 rounded-xl p-1 gap-1 mb-5 border border-white/10">
          <button
            type="button"
            onClick={() => setCourseType('hypertrophy')}
            aria-pressed={courseType === 'hypertrophy'}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
              ${courseType === 'hypertrophy'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            筋肥大
          </button>
          <button
            type="button"
            onClick={() => setCourseType('toning')}
            aria-pressed={courseType === 'toning'}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
              ${courseType === 'toning'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            引き締め
          </button>
        </div>

        {/* 目安カード */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 mb-5">
          <p className="label-xs mb-3">
            {isFirstTime ? '初回目安（体重・性別から推定）' : '目安（自己ベスト1RMの80%）'}
          </p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-bold text-cyan-400 tabular-nums leading-none">
              {hint.weight}
            </span>
            <span className="text-slate-300 text-xl mb-1">kg × {hint.reps}回</span>
          </div>
          {!isFirstTime && (
            <p className="text-xs text-slate-500 mt-2">
              1RM ≈ {bestOneRM.toFixed(1)} kg → 80% = {hint.weight} kg
            </p>
          )}
          {lastRecord && (
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-500">
              前回: {new Date(lastRecord.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
            </div>
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
              hintWeight={hint.weight}
              hintReps={hint.reps}
              profileWeight={profile.weight}
              supportsBodyweightToggle={exercise.supportsBodyweightToggle ?? false}
              onChange={updated => updateSet(index, updated)}
              onRemove={() => removeSet(index)}
              canRemove={sets.length > 1}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addSet}
          className="w-full h-12 border border-dashed border-white/15
            hover:border-cyan-500/40 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5
            rounded-xl text-sm font-medium transition-all duration-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          + セットを追加
        </button>

      </div>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 bg-slate-950/95 backdrop-blur-sm border-t border-white/10 pb-safe">
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600
              hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]
              text-white text-base font-bold rounded-xl transition-all
              shadow-xl shadow-cyan-500/25
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
  set: LocalSet
  index: number
  hintWeight: number
  hintReps: number
  profileWeight: number
  supportsBodyweightToggle: boolean
  onChange: (s: LocalSet) => void
  onRemove: () => void
  canRemove: boolean
}

function SetRow({
  set, index, hintWeight, hintReps, profileWeight, supportsBodyweightToggle, onChange, onRemove, canRemove,
}: SetRowProps) {
  const adjustWeight = (delta: number) => {
    if (set.isBodyweight) return
    const base = set.weight !== null ? set.weight : hintWeight
    const v = Math.max(0, parseFloat((base + delta).toFixed(1)))
    onChange({ ...set, weight: v })
  }

  const adjustReps = (delta: number) => {
    const base = set.reps !== null ? set.reps : hintReps
    const v = Math.max(1, base + delta)
    onChange({ ...set, reps: v })
  }

  const toggleBodyweight = () => {
    onChange({ ...set, isBodyweight: !set.isBodyweight, weight: null })
  }

  const effectiveWeight = set.isBodyweight ? profileWeight : set.weight
  const est1RM =
    effectiveWeight !== null && effectiveWeight > 0 && set.reps !== null && set.reps > 0
      ? calculate1RM(effectiveWeight, set.reps).toFixed(1)
      : null

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-4">

      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="label-xs">セット {index + 1}</span>
        <div className="flex items-center gap-3">
          {est1RM && (
            <span className="text-xs text-slate-500 tabular-nums">1RM ≈ {est1RM} kg</span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`セット ${index + 1} を削除`}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 重量 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-slate-500">重量</p>
          {supportsBodyweightToggle && (
            <button
              type="button"
              onClick={toggleBodyweight}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500
                ${set.isBodyweight
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40'}`}
            >
              自重
            </button>
          )}
        </div>

        {set.isBodyweight ? (
          <div className="h-11 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center gap-2">
            <span className="text-base font-bold text-cyan-400">自重</span>
            <span className="text-xs text-cyan-400/50">({profileWeight} kg)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <AdjBtn label="-5"   onClick={() => adjustWeight(-5)} />
            <AdjBtn label="-2.5" onClick={() => adjustWeight(-2.5)} wide />
            <input
              type="number"
              value={set.weight ?? ''}
              placeholder={String(hintWeight)}
              onChange={e => {
                const v = parseFloat(e.target.value)
                onChange({ ...set, weight: isNaN(v) ? null : Math.max(0, v) })
              }}
              inputMode="decimal"
              aria-label={`セット ${index + 1} の重量`}
              className="flex-1 min-w-0 h-11 bg-slate-800 border border-white/10 rounded-lg
                text-center text-lg font-bold tabular-nums text-white
                placeholder:text-slate-600 placeholder:font-normal
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus:border-cyan-500
                transition-all"
            />
            <AdjBtn label="+2.5" onClick={() => adjustWeight(2.5)} wide />
            <AdjBtn label="+5"   onClick={() => adjustWeight(5)} />
            <span className="text-xs text-slate-500 w-5 text-center shrink-0">kg</span>
          </div>
        )}
      </div>

      {/* 回数 */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5">回数</p>
        <div className="flex items-center gap-1.5">
          <AdjBtn label="−" onClick={() => adjustReps(-1)} wide />
          <input
            type="number"
            value={set.reps ?? ''}
            placeholder={String(hintReps)}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              onChange({ ...set, reps: isNaN(v) ? null : Math.max(1, v) })
            }}
            inputMode="numeric"
            aria-label={`セット ${index + 1} の回数`}
            className="flex-1 min-w-0 h-11 bg-slate-800 border border-white/10 rounded-lg
              text-center text-lg font-bold tabular-nums text-white
              placeholder:text-slate-600 placeholder:font-normal
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus:border-cyan-500
              transition-all"
          />
          <AdjBtn label="＋" onClick={() => adjustReps(1)} wide />
          <span className="text-xs text-slate-500 w-5 text-center shrink-0">回</span>
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
        bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-[0.94]
        border border-white/10 hover:border-white/20
        rounded-lg text-xs font-bold text-slate-300
        transition-all duration-75 shrink-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500`}
    >
      {label}
    </button>
  )
}
