/**
 * QuickWorkout.tsx
 * お任せコース: 自動プラン生成 → 順番記録 → サマリー
 *
 * ステップ:
 *   'select'  - 時間とフォーカスを選ぶ
 *   'plan'    - 生成されたプランを確認する
 *   'record'  - 種目ごとに記録する
 *   'summary' - 完了サマリー
 */

import { useState, useCallback } from 'react'
import type { BodyPart, Exercise, WorkoutRecord } from '../types'
import { EXERCISES } from '../data/exercises'
import { getProfile, getAllRecords, saveRecord } from '../lib/storage'
import {
  buildQuickWorkoutPlan,
  calcCapacity,
  type CourseType,
  type Focus,
  type PlannedExercise,
  type QuickWorkoutPlan,
} from '../lib/quickWorkout'
import { calculate10RMTarget, roundToNearestPlate, getBest1RM } from '../lib/calculations'
import { checkPR } from '../lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────────────────

const TIME_OPTIONS = [20, 30, 45, 60, 90] as const
type Minutes = (typeof TIME_OPTIONS)[number]

const FOCUS_OPTIONS: { value: Exclude<Focus, 'custom'>; label: string; emoji: string; desc: string }[] = [
  { value: 'full',  label: '全身',  emoji: '🏋️', desc: '全部位をバランスよく' },
  { value: 'upper', label: '上半身', emoji: '💪', desc: '胸・背・肩・腕' },
  { value: 'lower', label: '下半身', emoji: '🦵', desc: '脚・コア' },
]

const BODY_PART_OPTIONS: { value: BodyPart; label: string; emoji: string }[] = [
  { value: 'chest',     label: '胸',   emoji: '🫁' },
  { value: 'back',      label: '背中', emoji: '🔙' },
  { value: 'legs',      label: '脚',   emoji: '🦵' },
  { value: 'shoulders', label: '肩',   emoji: '🏋️' },
  { value: 'biceps',    label: '二頭筋', emoji: '💪' },
  { value: 'triceps',   label: '三頭筋', emoji: '🦾' },
  { value: 'core',      label: 'コア', emoji: '🎯' },
]

const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: '胸', back: '背中', legs: '脚', shoulders: '肩',
  biceps: '二頭筋', triceps: '三頭筋', core: 'コア',
}

type ToningPreset = 'full' | 'lower' | 'arms' | 'custom'

const TONING_PRESET_OPTIONS: { value: Exclude<ToningPreset, 'custom'>; label: string; emoji: string; desc: string; bodyParts: BodyPart[] }[] = [
  { value: 'full',  label: '全身引き締め', emoji: '✨', desc: '脚・三頭筋・肩・コア', bodyParts: ['legs', 'triceps', 'shoulders', 'core'] },
  { value: 'lower', label: '下半身・お尻', emoji: '🍑', desc: '脚・コア', bodyParts: ['legs', 'core'] },
  { value: 'arms',  label: '二の腕・肩',  emoji: '🦾', desc: '三頭筋・肩・コア', bodyParts: ['triceps', 'shoulders', 'core'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

interface RecordedSet { weight: number; reps: number }

interface RecordedExercise {
  exerciseId: string
  sets: RecordedSet[]
  prResult: { weightPR: boolean; onermPR: boolean } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onOpenDashboard: () => void
  onOpenHeatmap: () => void
  onOpenSettings: () => void
  onOpenTitle: () => void
}

type Step = 'select' | 'plan' | 'record' | 'summary'

export default function QuickWorkout({ onOpenDashboard, onOpenHeatmap, onOpenSettings, onOpenTitle }: Props) {
  const [step, setStep] = useState<Step>('select')
  const [minutes, setMinutes] = useState<Minutes>(45)
  const [focus, setFocus] = useState<Focus>('full')
  const [customBodyParts, setCustomBodyParts] = useState<BodyPart[]>([])
  const [courseType, setCourseType] = useState<CourseType>('hypertrophy')
  const [toningPreset, setToningPreset] = useState<ToningPreset>('full')
  const [plan, setPlan] = useState<QuickWorkoutPlan | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [recorded, setRecorded] = useState<RecordedExercise[]>([])

  const handleFocusChange = useCallback((f: Focus) => {
    setFocus(f)
  }, [])

  const canGenerate = courseType === 'toning'
    ? (toningPreset !== 'custom' || customBodyParts.length > 0)
    : (focus !== 'custom' || customBodyParts.length > 0)

  const handleGenerate = useCallback(() => {
    const profile = getProfile()
    if (!profile) return
    if (!canGenerate) return

    let activeFocus: Focus
    let activeBodyParts: BodyPart[] | undefined
    if (courseType === 'toning') {
      activeFocus = 'custom'
      if (toningPreset === 'custom') {
        activeBodyParts = customBodyParts
      } else {
        activeBodyParts = TONING_PRESET_OPTIONS.find(p => p.value === toningPreset)?.bodyParts
      }
    } else {
      activeFocus = focus
      activeBodyParts = focus === 'custom' ? customBodyParts : undefined
    }

    const records = getAllRecords()
    const generated = buildQuickWorkoutPlan({
      minutes,
      focus: activeFocus,
      customBodyParts: activeBodyParts,
      courseType,
      profile,
      records,
      exercises: EXERCISES,
    })
    setPlan(generated)
    setCurrentIndex(0)
    setRecorded([])
    setStep('plan')
  }, [minutes, focus, customBodyParts, courseType, toningPreset, canGenerate])

  const handleStartRecord = useCallback(() => {
    setStep('record')
  }, [])

  const handleExerciseSaved = useCallback((rec: RecordedExercise) => {
    setRecorded(prev => [...prev, rec])
    if (plan && currentIndex + 1 < plan.exercises.length) {
      setCurrentIndex(i => i + 1)
    } else {
      setStep('summary')
    }
  }, [plan, currentIndex])

  /** サマリーから「もう一度」でハブ（select）に戻る */
  const handleRestart = useCallback(() => {
    setPlan(null)
    setRecorded([])
    setCurrentIndex(0)
    setStep('select')
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-sky-50">

      {/* ヘッダー — ステップに応じてアクションを切替 */}
      <div className="sticky top-0 z-10 px-4 pt-safe pb-3 bg-white/95 backdrop-blur-sm border-b border-sky-100">
        <div className="flex items-center gap-3">

          {/* select: 設定アイコン */}
          {step === 'select' && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-slate-400 hover:text-slate-600 p-1 -ml-1 rounded-lg
                active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="設定"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* plan: 戻るアイコン（select へ） */}
          {step === 'plan' && (
            <button
              type="button"
              onClick={() => setStep('select')}
              className="text-sky-600 hover:text-sky-700 p-1 -ml-1 rounded-lg
                active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="部位選択に戻る"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* record / summary: スペーサー（誤タップ防止） */}
          {(step === 'record' || step === 'summary') && (
            <div className="w-7 h-7" aria-hidden="true" />
          )}

          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {step === 'summary'
                ? (courseType === 'toning' ? '引き締め完了 🎉' : 'お任せ完了 🎉')
                : (courseType === 'toning' ? '引き締めコース' : 'お任せコース')
              }
            </h1>
            {step === 'record' && plan && (
              <p className="text-xs text-slate-500">
                {currentIndex + 1} / {plan.exercises.length} 種目
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ステップコンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {step === 'select' && (
          <SelectStep
            minutes={minutes}
            focus={focus}
            customBodyParts={customBodyParts}
            courseType={courseType}
            toningPreset={toningPreset}
            canGenerate={canGenerate}
            onMinutesChange={setMinutes}
            onFocusChange={handleFocusChange}
            onCustomBodyPartsChange={setCustomBodyParts}
            onCourseTypeChange={setCourseType}
            onToningPresetChange={setToningPreset}
            onGenerate={handleGenerate}
            onOpenDashboard={onOpenDashboard}
            onOpenHeatmap={onOpenHeatmap}
            onOpenTitle={onOpenTitle}
          />
        )}
        {step === 'plan' && plan && (
          <PlanStep
            plan={plan}
            onBack={() => setStep('select')}
            onStart={handleStartRecord}
          />
        )}

        {step === 'record' && plan && (
          <RecordStep
            key={currentIndex}
            planned={plan.exercises[currentIndex]}
            index={currentIndex}
            total={plan.exercises.length}
            onSaved={handleExerciseSaved}
          />
        )}
        {step === 'summary' && plan && (
          <SummaryStep
            plan={plan}
            recorded={recorded}
            onRestart={handleRestart}
            onOpenDashboard={onOpenDashboard}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectStep
// ─────────────────────────────────────────────────────────────────────────────

function SelectStep({
  minutes, focus, customBodyParts, courseType, toningPreset, canGenerate,
  onMinutesChange, onFocusChange, onCustomBodyPartsChange,
  onCourseTypeChange, onToningPresetChange, onGenerate,
  onOpenDashboard, onOpenHeatmap, onOpenTitle,
}: {
  minutes: Minutes
  focus: Focus
  customBodyParts: BodyPart[]
  courseType: CourseType
  toningPreset: ToningPreset
  canGenerate: boolean
  onMinutesChange: (m: Minutes) => void
  onFocusChange: (f: Focus) => void
  onCustomBodyPartsChange: (parts: BodyPart[]) => void
  onCourseTypeChange: (c: CourseType) => void
  onToningPresetChange: (p: ToningPreset) => void
  onGenerate: () => void
  onOpenDashboard: () => void
  onOpenHeatmap: () => void
  onOpenTitle: () => void
}) {
  const { exerciseCount, totalSets } = calcCapacity(minutes)
  const isCustom = focus === 'custom'
  const isToning = courseType === 'toning'

  const toggleBodyPart = (bp: BodyPart) => {
    if (customBodyParts.includes(bp)) {
      onCustomBodyPartsChange(customBodyParts.filter(p => p !== bp))
    } else {
      onCustomBodyPartsChange([...customBodyParts, bp])
    }
  }

  const accentActive   = isToning ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
  const accentRing     = isToning ? 'focus-visible:ring-rose-500' : 'focus-visible:ring-sky-500'
  const generateBtnOn  = isToning
    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98] hover:bg-rose-600'
    : 'bg-sky-500 text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] hover:bg-sky-600'

  return (
    <div className="px-4 py-5 space-y-6">

      {/* コース切り替えタブ */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        <button
          type="button"
          onClick={() => onCourseTypeChange('hypertrophy')}
          aria-pressed={!isToning}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
            ${!isToning ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          💪 筋肥大
        </button>
        <button
          type="button"
          onClick={() => onCourseTypeChange('toning')}
          aria-pressed={isToning}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
            ${isToning ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          ✨ 引き締め
        </button>
      </div>

      {/* 導入テキスト */}
      {isToning ? (
        <div className="bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold">女性向け引き締めコース</p>
          <p className="text-xs text-rose-100 mt-0.5">15回高回数・軽負荷で脂肪燃焼＆引き締めを目指します</p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-sky-500 to-sky-400 text-white rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold">部位を選ぶだけでスタートできます</p>
          <p className="text-xs text-sky-100 mt-0.5">種目は自動で決まります。手動選択は不要です。</p>
        </div>
      )}

      {/* 時間選択 */}
      <section>
        <p className="label-xs mb-3">トレーニング時間</p>
        <div className="grid grid-cols-5 gap-2">
          {TIME_OPTIONS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onMinutesChange(m)}
              aria-pressed={minutes === m}
              className={`rounded-xl py-3 text-sm font-bold transition-all active:scale-95
                focus-visible:outline-none focus-visible:ring-2 ${accentRing}
                ${minutes === m
                  ? accentActive
                  : 'bg-white border border-sky-200 text-slate-700 hover:border-sky-300'
                }`}
            >
              {m}<span className="text-[10px] font-normal ml-0.5">分</span>
            </button>
          ))}
        </div>
      </section>

      {/* 引き締め: プリセット選択 */}
      {isToning && (
        <section>
          <p className="label-xs mb-3">コースを選ぶ</p>

          {/* プリセット / カスタムタブ */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-3 gap-1">
            <button
              type="button"
              onClick={() => { if (toningPreset === 'custom') onToningPresetChange('full') }}
              aria-pressed={toningPreset !== 'custom'}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                ${toningPreset !== 'custom' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              プリセット
            </button>
            <button
              type="button"
              onClick={() => onToningPresetChange('custom')}
              aria-pressed={toningPreset === 'custom'}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                ${toningPreset === 'custom' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              部位を指定
            </button>
          </div>

          {/* 引き締めプリセット */}
          {toningPreset !== 'custom' && (
            <div className="space-y-2">
              {TONING_PRESET_OPTIONS.map(opt => {
                const isSelected = toningPreset === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToningPresetChange(opt.value)}
                    aria-pressed={isSelected}
                    className={`w-full flex items-center gap-3 rounded-2xl p-4 transition-all active:scale-[0.98]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                      ${isSelected
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                        : 'bg-white border border-rose-100 text-slate-700 hover:border-rose-200 hover:shadow-sm'
                      }`}
                  >
                    <span className="text-xl" aria-hidden="true">{opt.emoji}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                        {opt.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <svg className="ml-auto" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M4 9L7.5 12.5L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* 引き締めカスタム部位 */}
          {toningPreset === 'custom' && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {BODY_PART_OPTIONS.map(opt => {
                  const selected = customBodyParts.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleBodyPart(opt.value)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-1 rounded-2xl py-3 px-2 text-center
                        transition-all active:scale-95
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                        ${selected
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                          : 'bg-white border border-rose-100 text-slate-600 hover:border-rose-200'
                        }`}
                    >
                      <span className="text-lg" aria-hidden="true">{opt.emoji}</span>
                      <span className="text-[11px] font-semibold leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {customBodyParts.length === 0 && (
                <p className="text-xs text-rose-500 mt-2.5 text-center font-medium">部位を1つ以上選んでください</p>
              )}
              {customBodyParts.length > 0 && (
                <p className="text-xs text-rose-400 mt-2.5 text-center font-medium">
                  {customBodyParts.map(bp => BODY_PART_LABELS[bp]).join('・')} を選択中
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 筋肥大: フォーカス選択（従来） */}
      {!isToning && (
        <section>
          <p className="label-xs mb-3">トレーニング部位</p>

          {/* タブ: プリセット / カスタム */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-3 gap-1">
            <button
              type="button"
              onClick={() => { if (isCustom) onFocusChange('full') }}
              aria-pressed={!isCustom}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                ${!isCustom ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              プリセット
            </button>
            <button
              type="button"
              onClick={() => onFocusChange('custom')}
              aria-pressed={isCustom}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                ${isCustom ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              部位を指定
            </button>
          </div>

          {/* プリセット選択肢 */}
          {!isCustom && (
            <div className="space-y-2">
              {FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFocusChange(opt.value)}
                  aria-pressed={focus === opt.value}
                  className={`w-full flex items-center gap-3 rounded-2xl p-4 transition-all active:scale-[0.98]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                    ${focus === opt.value
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                      : 'bg-white border border-sky-200 text-slate-700 hover:border-sky-300 hover:shadow-sm'
                    }`}
                >
                  <span className="text-xl" aria-hidden="true">{opt.emoji}</span>
                  <div className="text-left">
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${focus === opt.value ? 'text-sky-100' : 'text-slate-500'}`}>
                      {opt.desc}
                    </p>
                  </div>
                  {focus === opt.value && (
                    <svg className="ml-auto" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4 9L7.5 12.5L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* カスタム部位グリッド */}
          {isCustom && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {BODY_PART_OPTIONS.map(opt => {
                  const selected = customBodyParts.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleBodyPart(opt.value)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-1 rounded-2xl py-3 px-2 text-center
                        transition-all active:scale-95
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                        ${selected
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                          : 'bg-white border border-sky-200 text-slate-600 hover:border-sky-300'
                        }`}
                    >
                      <span className="text-lg" aria-hidden="true">{opt.emoji}</span>
                      <span className="text-[11px] font-semibold leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {customBodyParts.length === 0 && (
                <p className="text-xs text-rose-500 mt-2.5 text-center font-medium">
                  部位を1つ以上選んでください
                </p>
              )}
              {customBodyParts.length > 0 && (
                <p className="text-xs text-sky-600 mt-2.5 text-center font-medium">
                  {customBodyParts.map(bp => BODY_PART_LABELS[bp]).join('・')} を選択中
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 記録を見る */}
      <section>
        <p className="label-xs mb-2">記録を見る</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="flex-1 flex flex-col items-center gap-1.5 bg-white border border-sky-200
              rounded-2xl py-3.5 px-2 text-slate-700 hover:border-sky-300 hover:shadow-sm
              active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span className="text-xl" aria-hidden="true">📊</span>
            <span className="text-xs font-semibold">ダッシュボード</span>
          </button>
          <button
            type="button"
            onClick={onOpenHeatmap}
            className="flex-1 flex flex-col items-center gap-1.5 bg-white border border-sky-200
              rounded-2xl py-3.5 px-2 text-slate-700 hover:border-sky-300 hover:shadow-sm
              active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span className="text-xl" aria-hidden="true">📅</span>
            <span className="text-xs font-semibold">活動カレンダー</span>
          </button>
        </div>
      </section>

      {/* プレビュー */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm px-4 py-3">
        <p className="text-xs text-slate-500">予定</p>
        <p className="text-slate-900 font-bold mt-1 tabular-nums">
          <span className={`text-2xl ${isToning ? 'text-rose-500' : 'text-sky-600'}`}>{exerciseCount}</span>
          <span className="text-sm ml-1">種目</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className={`text-2xl ${isToning ? 'text-rose-500' : 'text-sky-600'}`}>{totalSets}</span>
          <span className="text-sm ml-1">セット</span>
          {isToning && <span className="text-xs text-rose-400 ml-2 font-normal">15回×軽重量</span>}
        </p>
      </div>

      {/* プラン生成ボタン */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`w-full h-14 rounded-2xl text-base font-bold transition-all
          focus-visible:outline-none focus-visible:ring-2 ${accentRing} focus-visible:ring-offset-2
          ${canGenerate ? generateBtnOn : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
      >
        {isToning ? 'プランを作成（引き締め）' : 'プランを作成'}
      </button>

      {/* タイトルへ戻る */}
      <div className="flex justify-center pb-2">
        <button
          type="button"
          onClick={onOpenTitle}
          className="text-xs text-slate-400 hover:text-slate-600 active:scale-95 transition-all
            px-3 py-1.5 rounded-lg
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          タイトルに戻る
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanStep
// ─────────────────────────────────────────────────────────────────────────────

function PlanStep({
  plan, onBack, onStart,
}: {
  plan: QuickWorkoutPlan
  onBack: () => void
  onStart: () => void
}) {
  const focusLabel = plan.focus === 'custom'
    ? (plan.customBodyParts?.map(bp => BODY_PART_LABELS[bp]).join('・') ?? 'カスタム')
    : (FOCUS_OPTIONS.find(f => f.value === plan.focus)?.label ?? plan.focus)

  const restMin = Math.floor(plan.restSecondsPerSet / 60)
  const restSec = plan.restSecondsPerSet % 60

  return (
    <div className="px-4 py-5 space-y-4">
      {/* プランヘッダー */}
      <div className="bg-sky-500 text-white rounded-2xl p-4">
        <p className="text-sm font-semibold text-sky-100">今日のプラン</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {plan.minutes}分 · {focusLabel}
            </p>
            <p className="text-sm text-sky-100 mt-0.5 tabular-nums">
              {plan.exercises.length}種目 · {plan.totalSets}セット ·
              インターバル{restMin > 0 ? `${restMin}分` : ''}{restSec > 0 ? `${restSec}秒` : ''}
            </p>
          </div>
          <span className="text-3xl" aria-hidden="true">⚡</span>
        </div>
      </div>

      {/* 種目リスト */}
      <div className="space-y-2">
        {plan.exercises.map((p, i) => (
          <PlanExerciseCard key={p.exercise.id} planned={p} index={i} />
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-12 bg-white border border-sky-200 text-slate-700 rounded-xl font-semibold
            active:scale-[0.98] transition-all hover:border-sky-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          やり直す
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex-[2] h-12 bg-sky-500 text-white rounded-xl font-bold text-base
            shadow-md shadow-sky-500/25 active:scale-[0.98] transition-all
            hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          スタート 🚀
        </button>
      </div>
    </div>
  )
}

function PlanExerciseCard({ planned, index }: { planned: PlannedExercise; index: number }) {
  return (
    <div className="bg-white border border-sky-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
      <span className="text-xs font-bold text-sky-500 w-5 text-center tabular-nums">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{planned.exercise.name}</p>
        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
          {planned.targetSets}セット × {planned.targetReps}回 · {planned.targetWeight}kg
          {planned.weightSource === 'estimate' && (
            <span className="ml-1.5 text-amber-500">推定</span>
          )}
        </p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
        ${planned.exercise.category === 'compound'
          ? 'bg-sky-100 text-sky-700'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
        }`}>
        {planned.exercise.category === 'compound' ? '複合' : '単関節'}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RecordStep
// ─────────────────────────────────────────────────────────────────────────────

interface SetInput { weight: string; reps: string }

function RecordStep({
  planned, index, total, onSaved,
}: {
  planned: PlannedExercise
  index: number
  total: number
  onSaved: (rec: RecordedExercise) => void
}) {
  const [sets, setSets] = useState<SetInput[]>(() =>
    Array.from({ length: planned.targetSets }, () => ({
      weight: String(planned.targetWeight),
      reps:   String(planned.targetReps),
    }))
  )
  const [saving, setSaving] = useState(false)

  const addSet = () =>
    setSets(prev => [...prev, { weight: prev[prev.length - 1]?.weight ?? '0', reps: '10' }])

  const removeSet = (i: number) =>
    setSets(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const updateSet = (i: number, field: 'weight' | 'reps', val: string) =>
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  const handleSave = () => {
    if (saving) return
    setSaving(true)

    const parsedSets = sets.map(s => ({
      weight: parseFloat(s.weight) || 0,
      reps:   parseInt(s.reps, 10) || 0,
    })).filter(s => s.weight > 0 && s.reps > 0)

    if (parsedSets.length === 0) {
      setSaving(false)
      return
    }

    const best1RM = getBest1RM(parsedSets)
    const nextTargetWeight = roundToNearestPlate(calculate10RMTarget(best1RM))

    const record: WorkoutRecord = {
      id: `${planned.exercise.id}-${Date.now()}`,
      exerciseId: planned.exercise.id,
      date: new Date().toISOString(),
      sets: parsedSets,
      best1RM,
      nextTargetWeight,
      source: 'quick',
    }

    const existingRecords = getAllRecords()
    saveRecord(record)
    const prResult = checkPR(record, existingRecords)

    onSaved({
      exerciseId: planned.exercise.id,
      sets: parsedSets,
      prResult,
    })
  }

  const handleSkip = () => {
    onSaved({ exerciseId: planned.exercise.id, sets: [], prResult: null })
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* 種目ヘッダー */}
      <div className="bg-white border border-sky-100 rounded-2xl px-4 py-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 tabular-nums">{index + 1}/{total} 種目目</p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{planned.exercise.name}</h2>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-0.5
            ${planned.exercise.category === 'compound'
              ? 'bg-sky-100 text-sky-700'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
            {planned.exercise.category === 'compound' ? '複合' : '単関節'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-3 text-sm text-slate-500 tabular-nums">
          <span>目安: {planned.targetWeight}kg × {planned.targetReps}回</span>
          {planned.weightSource === 'estimate' && (
            <span className="text-amber-500 text-xs font-semibold">推定値</span>
          )}
        </div>
      </div>

      {/* セット入力 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="label-xs">セット記録</p>
          <button
            type="button"
            onClick={addSet}
            className="text-xs text-sky-600 font-semibold hover:text-sky-700 active:scale-95 transition-all"
          >
            + セット追加
          </button>
        </div>

        {/* カラムヘッダー */}
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 mb-1">
          <span className="text-[10px] text-slate-400 text-center">#</span>
          <span className="text-[10px] text-slate-400 text-center">重量 (kg)</span>
          <span className="text-[10px] text-slate-400 text-center">回数</span>
          <span />
        </div>

        {sets.map((s, i) => (
          <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
            <span className="text-xs text-slate-400 text-center tabular-nums font-semibold">{i + 1}</span>
            <input
              type="number"
              value={s.weight}
              min="0"
              step="2.5"
              onChange={e => updateSet(i, 'weight', e.target.value)}
              aria-label={`セット${i + 1}の重量`}
              className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5 text-center
                text-sm font-bold tabular-nums text-slate-900
                focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30
                transition-all w-full"
            />
            <input
              type="number"
              value={s.reps}
              min="1"
              max="100"
              onChange={e => updateSet(i, 'reps', e.target.value)}
              aria-label={`セット${i + 1}の回数`}
              className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5 text-center
                text-sm font-bold tabular-nums text-slate-900
                focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30
                transition-all w-full"
            />
            <button
              type="button"
              onClick={() => removeSet(i)}
              aria-label={`セット${i + 1}を削除`}
              className="text-slate-300 hover:text-rose-400 active:scale-90 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSkip}
          className="flex-1 h-12 bg-white border border-sky-200 text-slate-500 rounded-xl font-semibold text-sm
            active:scale-[0.98] transition-all hover:border-sky-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          スキップ
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] h-12 bg-sky-500 text-white rounded-xl font-bold
            shadow-md shadow-sky-500/25 active:scale-[0.98] transition-all
            hover:bg-sky-600 disabled:opacity-50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          記録して次へ →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryStep
// ─────────────────────────────────────────────────────────────────────────────

function SummaryStep({
  plan, recorded, onRestart, onOpenDashboard,
}: {
  plan: QuickWorkoutPlan
  recorded: RecordedExercise[]
  onRestart: () => void
  onOpenDashboard: () => void
}) {
  const completedCount = recorded.filter(r => r.sets.length > 0).length
  const skippedCount   = recorded.filter(r => r.sets.length === 0).length
  const totalSets = recorded.reduce((acc, r) => acc + r.sets.length, 0)
  const totalReps = recorded.reduce((acc, r) =>
    acc + r.sets.reduce((a, s) => a + s.reps, 0), 0
  )
  const totalVolume = recorded.reduce((acc, r) =>
    acc + r.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0
  )
  const prs = recorded.filter(r => r.prResult?.weightPR || r.prResult?.onermPR)

  const getExName = (exerciseId: string) =>
    plan.exercises.find(p => p.exercise.id === exerciseId)?.exercise.name ?? exerciseId

  return (
    <div className="px-4 py-5 space-y-4 animate-fade-up">
      {/* 完了バナー */}
      <div className="bg-sky-500 text-white rounded-3xl p-5 text-center">
        <p className="text-4xl mb-2">🎉</p>
        <h2 className="text-xl font-bold">お疲れさまでした！</h2>
        <p className="text-sky-100 text-sm mt-1">お任せコース完了</p>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-2">
        <StatChip label="完了種目" value={`${completedCount}`} unit="種目" />
        <StatChip label="総セット" value={`${totalSets}`} unit="セット" />
        <StatChip label="総レップ数" value={`${totalReps}`} unit="回" />
        <StatChip label="総ボリューム" value={`${totalVolume.toLocaleString()}`} unit="kg" />
      </div>

      {/* PR バッジ */}
      {prs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold text-amber-700 mb-2">🏆 自己ベスト更新！</p>
          <ul className="space-y-1">
            {prs.map(r => (
              <li key={r.exerciseId} className="text-xs text-amber-600">
                {getExName(r.exerciseId)} —{' '}
                {[
                  r.prResult?.onermPR && '推定 1RM',
                  r.prResult?.weightPR && '最大重量',
                ].filter(Boolean).join(' と ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* スキップした種目 */}
      {skippedCount > 0 && (
        <p className="text-xs text-slate-400 text-center">
          {skippedCount} 種目をスキップしました
        </p>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 h-14 bg-white border border-sky-200 text-slate-700 rounded-2xl font-semibold
            active:scale-[0.98] transition-all hover:border-sky-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          もう一度
        </button>
        <button
          type="button"
          onClick={onOpenDashboard}
          className="flex-[2] h-14 bg-sky-500 text-white rounded-2xl text-base font-bold
            shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all
            hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          📊 記録を確認する
        </button>
      </div>
    </div>
  )
}

function StatChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white border border-sky-100 rounded-2xl px-4 py-3 shadow-sm">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
        {value}<span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}
