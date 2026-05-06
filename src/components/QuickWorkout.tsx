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
import { calculate10RMTarget, roundToNearestPlate, getBest1RM, calcNextTarget } from '../lib/calculations'
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

// 曜日ベースの自動フォーカス（ユーザーが詳細を開かなかった場合に毎日違うメニューを提示）
const HYPERTROPHY_DAILY_FOCUS: Record<number, Exclude<Focus, 'custom'>> = {
  0: 'full',  // 日
  1: 'upper', // 月
  2: 'lower', // 火
  3: 'upper', // 水
  4: 'lower', // 木
  5: 'full',  // 金
  6: 'upper', // 土
}
const TONING_DAILY_PRESET: Record<number, Exclude<ToningPreset, 'custom'>> = {
  0: 'full',  // 日
  1: 'lower', // 月
  2: 'arms',  // 火
  3: 'lower', // 水（ヒップ重視）
  4: 'full',  // 木
  5: 'lower', // 金
  6: 'arms',  // 土
}
function getTodayHypertrophyFocus(): Exclude<Focus, 'custom'> {
  return HYPERTROPHY_DAILY_FOCUS[new Date().getDay()]
}
function getTodayToningPreset(): Exclude<ToningPreset, 'custom'> {
  return TONING_DAILY_PRESET[new Date().getDay()]
}

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
  // 初期値はプロファイル + 曜日ベースの自動ローテーション
  const [minutes, setMinutes] = useState<Minutes>(() => {
    const p = getProfile()
    return (p?.defaultMinutes ?? 45) as Minutes
  })
  const [courseType, setCourseType] = useState<CourseType>(() => {
    const p = getProfile()
    return p?.defaultCourse ?? 'hypertrophy'
  })
  const [focus, setFocus] = useState<Focus>(() => getTodayHypertrophyFocus())
  const [toningPreset, setToningPreset] = useState<ToningPreset>(() => getTodayToningPreset())
  const [customBodyParts, setCustomBodyParts] = useState<BodyPart[]>([])
  const [plan, setPlan] = useState<QuickWorkoutPlan | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [recorded, setRecorded] = useState<RecordedExercise[]>([])

  const handleFocusChange = useCallback((f: Focus) => {
    setFocus(f)
  }, [])

  // コース切り替え時は、その日の自動推奨に再リセット（ユーザーが詳細パネルで再変更可能）
  const handleCourseTypeChange = useCallback((c: CourseType) => {
    setCourseType(c)
    if (c === 'toning') {
      setToningPreset(getTodayToningPreset())
    } else {
      setFocus(getTodayHypertrophyFocus())
    }
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
      experienceLevel: profile.experienceLevel,
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
    <div className="flex flex-col min-h-screen bg-slate-950">

      {/* ヘッダー — ステップに応じてアクションを切替 */}
      <div className="sticky top-0 z-10 px-4 pt-safe pb-3 bg-slate-950/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">

          {/* select: 設定アイコン */}
          {step === 'select' && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-slate-500 hover:text-slate-300 p-1 -ml-1 rounded-lg
                active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
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
              className="text-cyan-400 hover:text-cyan-300 p-1 -ml-1 rounded-lg
                active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
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
            <h1 className="text-lg font-bold tracking-tight text-white">
              {step === 'summary'
                ? (courseType === 'toning' ? '引き締め完了' : 'お任せ完了')
                : (courseType === 'toning' ? '引き締めコース' : 'お任せコース')
              }
            </h1>
            {step === 'record' && plan && (
              <p className="text-xs text-slate-400">
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
            onCourseTypeChange={handleCourseTypeChange}
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
  const [detailsOpen, setDetailsOpen] = useState(false)
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

  // おすすめカード用のフォーカスラベル
  const focusLabel = (() => {
    if (isToning) {
      if (toningPreset === 'custom') {
        return customBodyParts.length > 0
          ? customBodyParts.map(bp => BODY_PART_LABELS[bp]).join('・')
          : '部位未選択'
      }
      return TONING_PRESET_OPTIONS.find(o => o.value === toningPreset)?.label ?? toningPreset
    }
    if (focus === 'custom') {
      return customBodyParts.length > 0
        ? customBodyParts.map(bp => BODY_PART_LABELS[bp]).join('・')
        : '部位未選択'
    }
    return FOCUS_OPTIONS.find(o => o.value === focus)?.label ?? focus
  })()

  const accentActive   = isToning ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
  const accentRing     = isToning ? 'focus-visible:ring-rose-500' : 'focus-visible:ring-cyan-500'
  const startBtnOn     = isToning
    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98] hover:bg-rose-600'
    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 active:scale-[0.98] hover:from-cyan-400 hover:to-blue-500'

  return (
    <div className="px-4 py-5 space-y-6">

      {/* 今日のおすすめカード */}
      <div className={`rounded-3xl p-5 text-white shadow-lg
        ${isToning
          ? 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-500/25'
          : 'bg-gradient-to-br from-cyan-600 to-blue-600 shadow-cyan-500/25'}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">今日のおすすめ</p>
        <p className="text-xl font-bold mt-1.5">
          {isToning ? '引き締めコース' : '筋肥大コース'}
        </p>
        <p className="text-sm text-white/90 mt-1 tabular-nums">
          {minutes}分 ・ {focusLabel} ・ {exerciseCount}種目（{totalSets}セット）
        </p>
      </div>

      {/* スタートボタン */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`w-full h-16 rounded-2xl text-lg font-bold transition-all
          focus-visible:outline-none focus-visible:ring-2 ${accentRing} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
          ${canGenerate ? startBtnOn : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'}`}
      >
        スタート
      </button>

      {/* 詳細を変更する（折りたたみ） */}
      <div>
        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          aria-expanded={detailsOpen}
          aria-controls="quickworkout-details"
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-400
            hover:text-slate-200 active:scale-[0.98] py-2.5 rounded-xl transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          詳細を変更する
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={`transition-transform ${detailsOpen ? 'rotate-180' : ''}`} aria-hidden="true">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {detailsOpen && (
      <div id="quickworkout-details" className="space-y-6">

      {/* コース切り替えタブ */}
      <div className="flex bg-slate-900 rounded-2xl p-1 gap-1 border border-white/10">
        <button
          type="button"
          onClick={() => onCourseTypeChange('hypertrophy')}
          aria-pressed={!isToning}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
            ${!isToning ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          筋肥大
        </button>
        <button
          type="button"
          onClick={() => onCourseTypeChange('toning')}
          aria-pressed={isToning}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
            ${isToning ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          引き締め
        </button>
      </div>

      {/* 導入テキスト */}
      {isToning ? (
        <div className="bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold">女性向け引き締めコース</p>
          <p className="text-xs text-rose-100 mt-0.5">1RMの80%・10回で脂肪燃焼＆引き締めを目指します</p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold">部位を選ぶだけでスタートできます</p>
          <p className="text-xs text-cyan-100 mt-0.5">種目は自動で決まります。手動選択は不要です。</p>
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
                  : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-white/20'
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
          <div className="flex bg-slate-900 rounded-xl p-1 mb-3 gap-1 border border-white/10">
            <button
              type="button"
              onClick={() => { if (toningPreset === 'custom') onToningPresetChange('full') }}
              aria-pressed={toningPreset !== 'custom'}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                ${toningPreset !== 'custom' ? 'bg-slate-800 text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              プリセット
            </button>
            <button
              type="button"
              onClick={() => onToningPresetChange('custom')}
              aria-pressed={toningPreset === 'custom'}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                ${toningPreset === 'custom' ? 'bg-slate-800 text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
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
                        : 'bg-slate-900 border border-rose-500/20 text-slate-300 hover:border-rose-500/30'
                      }`}
                  >
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
                      className={`flex items-center justify-center rounded-2xl py-3.5 px-2 text-center
                        transition-all active:scale-95
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                        ${selected
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                          : 'bg-slate-900 border border-rose-500/20 text-slate-400 hover:border-rose-500/30'
                        }`}
                    >
                      <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {customBodyParts.length === 0 && (
                <p className="text-xs text-rose-400 mt-2.5 text-center font-medium">部位を1つ以上選んでください</p>
              )}
              {customBodyParts.length > 0 && (
                <p className="text-xs text-rose-400/70 mt-2.5 text-center font-medium">
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
          <div className="flex bg-slate-900 rounded-xl p-1 mb-3 gap-1 border border-white/10">
            <button
              type="button"
              onClick={() => { if (isCustom) onFocusChange('full') }}
              aria-pressed={!isCustom}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                ${!isCustom ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              プリセット
            </button>
            <button
              type="button"
              onClick={() => onFocusChange('custom')}
              aria-pressed={isCustom}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                ${isCustom ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
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
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                    ${focus === opt.value
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                      : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${focus === opt.value ? 'text-cyan-100' : 'text-slate-500'}`}>
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
                      className={`flex items-center justify-center rounded-2xl py-3.5 px-2 text-center
                        transition-all active:scale-95
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                        ${selected
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                          : 'bg-slate-900 border border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                    >
                      <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {customBodyParts.length === 0 && (
                <p className="text-xs text-rose-400 mt-2.5 text-center font-medium">
                  部位を1つ以上選んでください
                </p>
              )}
              {customBodyParts.length > 0 && (
                <p className="text-xs text-cyan-400/70 mt-2.5 text-center font-medium">
                  {customBodyParts.map(bp => BODY_PART_LABELS[bp]).join('・')} を選択中
                </p>
              )}
            </div>
          )}
        </section>
      )}

      </div>
      )}

      {/* 記録を見る */}
      <section>
        <p className="label-xs mb-2">記録を見る</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="flex-1 flex items-center justify-between bg-slate-900 border border-white/10
              rounded-2xl py-3.5 px-4 text-slate-300 hover:border-white/20
              active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <span className="text-xs font-semibold">ダッシュボード</span>
            <span className="text-slate-600 text-xs">→</span>
          </button>
          <button
            type="button"
            onClick={onOpenHeatmap}
            className="flex-1 flex items-center justify-between bg-slate-900 border border-white/10
              rounded-2xl py-3.5 px-4 text-slate-300 hover:border-white/20
              active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <span className="text-xs font-semibold">活動カレンダー</span>
            <span className="text-slate-600 text-xs">→</span>
          </button>
        </div>
      </section>

      {/* タイトルへ戻る */}
      <div className="flex justify-center pb-2">
        <button
          type="button"
          onClick={onOpenTitle}
          className="text-xs text-slate-600 hover:text-slate-400 active:scale-95 transition-all
            px-3 py-1.5 rounded-lg
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
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
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-2xl p-4">
        <p className="text-sm font-semibold text-cyan-100">今日のプラン</p>
        <div className="mt-1">
          <p className="text-2xl font-bold tabular-nums">
            {plan.minutes}分 · {focusLabel}
          </p>
          <p className="text-sm text-cyan-100 mt-0.5 tabular-nums">
            {plan.exercises.length}種目 · {plan.totalSets}セット ·
            インターバル{restMin > 0 ? `${restMin}分` : ''}{restSec > 0 ? `${restSec}秒` : ''}
          </p>
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
          className="flex-1 h-12 bg-slate-900 border border-white/10 text-slate-300 rounded-xl font-semibold
            active:scale-[0.98] transition-all hover:border-white/20
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          やり直す
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex-[2] h-12 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-base
            shadow-md shadow-cyan-500/25 active:scale-[0.98] transition-all
            hover:from-cyan-400 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          スタート
        </button>
      </div>
    </div>
  )
}

function PlanExerciseCard({ planned, index }: { planned: PlannedExercise; index: number }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <span className="text-xs font-bold text-cyan-400 w-5 text-center tabular-nums">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{planned.exercise.name}</p>
        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
          {planned.targetSets}セット × {planned.targetReps}回 · {planned.targetWeight}kg
          {planned.weightSource === 'estimate' && (
            <span className="ml-1.5 text-amber-400">推定</span>
          )}
        </p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
        ${planned.exercise.category === 'compound'
          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
        {planned.exercise.category === 'compound' ? '複合' : '単関節'}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RecordStep
// ─────────────────────────────────────────────────────────────────────────────

interface SetInput { weight: string; reps: string; isBodyweight: boolean }

function RecordStep({
  planned, index, total, onSaved,
}: {
  planned: PlannedExercise
  index: number
  total: number
  onSaved: (rec: RecordedExercise) => void
}) {
  const profile = getProfile()!
  const [sets, setSets] = useState<SetInput[]>(() =>
    Array.from({ length: planned.targetSets }, () => ({
      weight: '',
      reps: '',
      isBodyweight: false,
    }))
  )
  const [allBodyweight, setAllBodyweight] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTips, setShowTips] = useState(false)

  const toggleAllBodyweight = () => {
    const next = !allBodyweight
    setAllBodyweight(next)
    setSets(prev => prev.map(s => ({ ...s, isBodyweight: next, weight: '' })))
  }

  const addSet = () =>
    setSets(prev => [...prev, { weight: '', reps: '', isBodyweight: allBodyweight }])

  const removeSet = (i: number) =>
    setSets(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const updateSet = (i: number, field: 'weight' | 'reps', val: string) =>
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  const handleSave = () => {
    if (saving) return
    setSaving(true)

    const parsedSets = sets
      .map(s => ({
        weight: s.isBodyweight ? profile.weight : (parseFloat(s.weight) || 0),
        reps: parseInt(s.reps, 10) || 0,
        ...(s.isBodyweight ? { isBodyweight: true as const } : {}),
      }))
      .filter(s => (s.isBodyweight || s.weight > 0) && s.reps > 0)

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
      {/* 種目ヘッダー + 目安 */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 tabular-nums">{index + 1}/{total} 種目目</p>
            <h2 className="text-lg font-bold text-white mt-0.5">{planned.exercise.name}</h2>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-0.5
            ${planned.exercise.category === 'compound'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
            {planned.exercise.category === 'compound' ? '複合' : '単関節'}
          </span>
        </div>

        {/* 目安（大きく表示） */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
            目安{planned.weightSource === 'estimate' ? '（初回推定）' : '（1RMの80%）'}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-cyan-400 tabular-nums leading-none">
              {planned.targetWeight}
            </span>
            <span className="text-slate-300 text-lg mb-0.5">kg × {planned.targetReps}回</span>
            {planned.weightSource === 'estimate' && (
              <span className="text-amber-400 text-xs font-semibold mb-1 ml-1">推定値</span>
            )}
          </div>
        </div>
      </div>

      {/* フォームのコツ（折りたたみ） */}
      <div>
        <button
          type="button"
          onClick={() => setShowTips(s => !s)}
          aria-expanded={showTips}
          aria-controls="exercise-tips"
          className="w-full flex items-center justify-between bg-slate-900 border border-white/10
            rounded-xl px-4 py-3 text-sm font-semibold text-slate-300
            hover:border-white/20 active:scale-[0.98] transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 11v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            フォームのコツを見る
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={`transition-transform ${showTips ? 'rotate-180' : ''}`} aria-hidden="true">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showTips && (
          <div id="exercise-tips" className="mt-2 bg-slate-900 border border-white/10 rounded-xl px-4 py-4 space-y-4">
            {/* 種目の説明 */}
            <p className="text-sm text-slate-200 leading-relaxed">
              {planned.exercise.description}
            </p>

            {/* セットアップ */}
            {planned.exercise.setupTips && planned.exercise.setupTips.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 mb-1.5">
                  セットアップ
                </p>
                <ul className="space-y-1">
                  {planned.exercise.setupTips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="text-cyan-400 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 注意点（よくある間違い） */}
            {planned.exercise.commonMistakes && planned.exercise.commonMistakes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-1.5">
                  注意点
                </p>
                <ul className="space-y-1">
                  {planned.exercise.commonMistakes.map((m, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 怪我リスクの警告 */}
            {planned.exercise.cautionFlag && planned.exercise.cautionNote && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2.5">
                <p className="text-xs font-bold text-rose-400 mb-0.5">⚠️ 注意</p>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  {planned.exercise.cautionNote}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 自重トグル（懸垂・ディップスのみ） */}
      {planned.exercise.supportsBodyweightToggle && (
        <button
          type="button"
          onClick={toggleAllBodyweight}
          className={`w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
            ${allBodyweight
              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
              : 'bg-slate-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
        >
          <span className="text-sm font-semibold">自重で記録する</span>
          <span className="text-xs">
            {allBodyweight ? `体重 ${profile.weight} kg で 1RM 計算` : 'タップで切り替え'}
          </span>
        </button>
      )}

      {/* セット入力 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="label-xs">セット記録</p>
          <button
            type="button"
            onClick={addSet}
            className="text-xs text-cyan-400 font-semibold hover:text-cyan-300 active:scale-95 transition-all"
          >
            + セット追加
          </button>
        </div>

        {/* カラムヘッダー */}
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 mb-1">
          <span className="text-[10px] text-slate-500 text-center">#</span>
          <span className="text-[10px] text-slate-500 text-center">
            {allBodyweight ? '重量' : '重量 (kg)'}
          </span>
          <span className="text-[10px] text-slate-500 text-center">回数</span>
          <span />
        </div>

        {sets.map((s, i) => (
          <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
            <span className="text-xs text-slate-500 text-center tabular-nums font-semibold">{i + 1}</span>
            {s.isBodyweight ? (
              <div className="bg-slate-800 border border-cyan-500/30 rounded-xl px-3 py-2.5 text-center">
                <span className="text-sm font-bold text-cyan-400">自重</span>
              </div>
            ) : (
              <input
                type="number"
                value={s.weight}
                min="0"
                step="2.5"
                placeholder={String(planned.targetWeight)}
                onChange={e => updateSet(i, 'weight', e.target.value)}
                aria-label={`セット${i + 1}の重量`}
                className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-center
                  text-sm font-bold tabular-nums text-white
                  placeholder:text-slate-600 placeholder:font-normal
                  focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30
                  transition-all w-full"
              />
            )}
            <input
              type="number"
              value={s.reps}
              min="1"
              max="100"
              placeholder={String(planned.targetReps)}
              onChange={e => updateSet(i, 'reps', e.target.value)}
              aria-label={`セット${i + 1}の回数`}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-center
                text-sm font-bold tabular-nums text-white
                placeholder:text-slate-600 placeholder:font-normal
                focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30
                transition-all w-full"
            />
            <button
              type="button"
              onClick={() => removeSet(i)}
              aria-label={`セット${i + 1}を削除`}
              className="text-slate-600 hover:text-rose-400 active:scale-90 transition-all"
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
          className="flex-1 h-12 bg-slate-900 border border-white/10 text-slate-500 rounded-xl font-semibold text-sm
            active:scale-[0.98] transition-all hover:border-white/20
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          スキップ
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] h-12 bg-cyan-500 text-white rounded-xl font-bold
            shadow-md shadow-cyan-500/25 active:scale-[0.98] transition-all
            hover:bg-cyan-400 disabled:opacity-50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
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
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-3xl p-5 text-center">
        <h2 className="text-xl font-bold">お疲れさまでした</h2>
        <p className="text-cyan-100 text-sm mt-1">お任せコース完了</p>
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3.5">
          <p className="text-sm font-bold text-amber-400 mb-2">自己ベスト更新</p>
          <ul className="space-y-1">
            {prs.map(r => (
              <li key={r.exerciseId} className="text-xs text-amber-400/80">
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
        <p className="text-xs text-slate-500 text-center">
          {skippedCount} 種目をスキップしました
        </p>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 h-14 bg-slate-900 border border-white/10 text-slate-300 rounded-2xl font-semibold
            active:scale-[0.98] transition-all hover:border-white/20
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          もう一度
        </button>
        <button
          type="button"
          onClick={onOpenDashboard}
          className="flex-[2] h-14 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl text-base font-bold
            shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all
            hover:from-cyan-400 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          記録を確認する
        </button>
      </div>
    </div>
  )
}

function StatChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xl font-bold text-white mt-0.5 tabular-nums">
        {value}<span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
      </p>
    </div>
  )
}
