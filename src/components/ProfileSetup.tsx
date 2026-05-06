import { useState } from 'react'
import { saveProfile } from '../lib/storage'
import type { UserProfile } from '../types'

interface Props {
  onComplete: () => void
}

type Step = 1 | 2 | 3

const TIME_OPTIONS = [30, 45, 60, 75] as const
type Minutes = (typeof TIME_OPTIONS)[number]

export default function ProfileSetup({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [height, setHeight] = useState('170')
  const [weight, setWeight] = useState('65')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 2 — 性別から自動推定（手動変更可）
  const [course, setCourse] = useState<UserProfile['defaultCourse']>('hypertrophy')
  // 性別を変えたとき初期値だけ追従（一度ユーザーが選んだら追従しない）
  const [courseTouched, setCourseTouched] = useState(false)

  // Step 3
  const [experienceLevel, setExperienceLevel] =
    useState<UserProfile['experienceLevel']>('beginner')
  const [defaultMinutes, setDefaultMinutes] = useState<Minutes>(45)

  const handleGenderChange = (g: 'male' | 'female') => {
    setGender(g)
    if (!courseTouched) {
      setCourse(g === 'female' ? 'toning' : 'hypertrophy')
    }
  }

  const handleCourseChange = (c: UserProfile['defaultCourse']) => {
    setCourse(c)
    setCourseTouched(true)
  }

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (isNaN(h) || h < 100 || h > 250)
      errs.height = '100〜250 cm の範囲で入力してください'
    if (isNaN(w) || w < 20 || w > 300)
      errs.weight = '20〜300 kg の範囲で入力してください'
    return errs
  }

  const handleNext1 = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setStep(2)
  }

  const handleSubmit = () => {
    const profile: UserProfile = {
      height: parseFloat(height),
      weight: parseFloat(weight),
      gender,
      defaultCourse: course,
      experienceLevel,
      defaultMinutes,
    }
    saveProfile(profile)
    onComplete()
  }

  const clearError = (key: string) =>
    setErrors(prev => ({ ...prev, [key]: '' }))

  return (
    <div className="flex flex-col min-h-screen px-4 pt-safe bg-slate-950">
      {/* ステップインジケーター */}
      <div className="flex justify-center gap-2 pt-6">
        {[1, 2, 3].map(n => (
          <span
            key={n}
            className={`h-1.5 rounded-full transition-all ${
              n === step ? 'w-8 bg-cyan-400' : 'w-3 bg-slate-700'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-8 py-6">
        {step === 1 && (
          <Step1
            gender={gender} onGenderChange={handleGenderChange}
            height={height} onHeightChange={v => { setHeight(v); clearError('height') }}
            weight={weight} onWeightChange={v => { setWeight(v); clearError('weight') }}
            errors={errors}
          />
        )}
        {step === 2 && (
          <Step2 course={course} onCourseChange={handleCourseChange} />
        )}
        {step === 3 && (
          <Step3
            experienceLevel={experienceLevel}
            onExperienceLevelChange={setExperienceLevel}
            defaultMinutes={defaultMinutes}
            onDefaultMinutesChange={setDefaultMinutes}
          />
        )}
      </div>

      {/* CTA */}
      <div className="py-5 pb-safe space-y-2">
        {step === 1 && (
          <PrimaryButton onClick={handleNext1}>次へ</PrimaryButton>
        )}
        {step === 2 && (
          <>
            <PrimaryButton onClick={() => setStep(3)}>次へ</PrimaryButton>
            <SecondaryButton onClick={() => setStep(1)}>戻る</SecondaryButton>
          </>
        )}
        {step === 3 && (
          <>
            <PrimaryButton onClick={handleSubmit}>はじめる</PrimaryButton>
            <SecondaryButton onClick={() => setStep(2)}>戻る</SecondaryButton>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: 性別 + 身長 + 体重
// ─────────────────────────────────────────────────────────────────────────────

function Step1({
  gender, onGenderChange,
  height, onHeightChange,
  weight, onWeightChange,
  errors,
}: {
  gender: 'male' | 'female'
  onGenderChange: (g: 'male' | 'female') => void
  height: string
  onHeightChange: (v: string) => void
  weight: string
  onWeightChange: (v: string) => void
  errors: Record<string, string>
}) {
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">あなたについて</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          推定重量の算出に使います
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* 性別 */}
        <div className="flex flex-col gap-2">
          <span className="label-xs">性別</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="性別選択">
            {(['male', 'female'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => onGenderChange(g)}
                aria-pressed={gender === g}
                className={`h-12 rounded-xl text-sm font-semibold transition-all duration-100 active:scale-[0.97]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
                  ${gender === g
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:border-white/20'
                  }`}
              >
                {g === 'male' ? '男性' : '女性'}
              </button>
            ))}
          </div>
        </div>

        {/* 身長 */}
        <NumField
          id="height" label="身長" unit="cm"
          value={height} onChange={onHeightChange} error={errors.height}
        />
        {/* 体重 */}
        <NumField
          id="weight" label="体重" unit="kg"
          value={weight} onChange={onWeightChange} error={errors.weight}
        />
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: 目的（コース）
// ─────────────────────────────────────────────────────────────────────────────

function Step2({
  course, onCourseChange,
}: {
  course: UserProfile['defaultCourse']
  onCourseChange: (c: UserProfile['defaultCourse']) => void
}) {
  const options = [
    {
      value: 'hypertrophy' as const,
      icon: '💪',
      label: '筋肉をつけたい',
      desc: '筋肥大コース。重い負荷で大きく強くなる',
    },
    {
      value: 'toning' as const,
      icon: '✨',
      label: '引き締めたい',
      desc: '引き締めコース。お尻・脚・お腹を中心に、メリハリのある体に',
    },
  ]

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">目的を選んでください</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          あとから設定で変更できます
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {options.map(opt => {
          const selected = course === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCourseChange(opt.value)}
              aria-pressed={selected}
              className={`text-left rounded-2xl px-5 py-5 transition-all active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                ${selected
                  ? 'bg-cyan-500/15 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 border border-white/10 hover:border-white/20'
                }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0" aria-hidden="true">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-bold ${selected ? 'text-cyan-300' : 'text-white'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
                {selected && (
                  <svg className="shrink-0 mt-1" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 10l3.5 3.5L15 7" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: 経験レベル + 標準時間
// ─────────────────────────────────────────────────────────────────────────────

function Step3({
  experienceLevel, onExperienceLevelChange,
  defaultMinutes, onDefaultMinutesChange,
}: {
  experienceLevel: UserProfile['experienceLevel']
  onExperienceLevelChange: (v: UserProfile['experienceLevel']) => void
  defaultMinutes: Minutes
  onDefaultMinutesChange: (m: Minutes) => void
}) {
  const expOptions: { value: UserProfile['experienceLevel']; label: string; sub: string }[] = [
    { value: 'beginner',     label: '初心者',   sub: 'ジム歴 6ヶ月未満' },
    { value: 'intermediate', label: '中級者',   sub: '6ヶ月〜2年' },
    { value: 'advanced',     label: '上級者',   sub: '2年以上' },
  ]

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">いつものスタイルは？</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          安全な目標重量と所要時間を提案します
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* 経験レベル */}
        <div className="flex flex-col gap-2">
          <span className="label-xs">経験レベル</span>
          <div className="flex flex-col gap-2">
            {expOptions.map(opt => {
              const selected = experienceLevel === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onExperienceLevelChange(opt.value)}
                  aria-pressed={selected}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all active:scale-[0.98]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                    ${selected
                      ? 'bg-cyan-500/15 border-2 border-cyan-400'
                      : 'bg-slate-900 border border-white/10 hover:border-white/20'
                    }`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-bold ${selected ? 'text-cyan-300' : 'text-white'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                  </div>
                  {selected && (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 10l3.5 3.5L15 7" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 標準時間 */}
        <div className="flex flex-col gap-2">
          <span className="label-xs">1 回の時間</span>
          <div className="grid grid-cols-4 gap-2">
            {TIME_OPTIONS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onDefaultMinutesChange(m)}
                aria-pressed={defaultMinutes === m}
                className={`rounded-xl py-3 text-sm font-bold transition-all active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                  ${defaultMinutes === m
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                    : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-white/20'
                  }`}
              >
                {m}<span className="text-[10px] font-normal ml-0.5">分</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 共通サブコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

function NumField({
  id, label, value, unit, error, onChange,
}: {
  id: string
  label: string
  value: string
  unit: string
  error?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-xs">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          inputMode="decimal"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full h-14 bg-slate-800 border rounded-xl px-4 text-xl font-semibold tabular-nums text-right pr-14
            text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-shadow
            ${error ? 'border-red-400 ring-2 ring-red-400/40' : 'border-white/10'}`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none select-none">
          {unit}
        </span>
      </div>
      {error && <p id={`${id}-error`} className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600
        hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]
        text-white text-base font-bold rounded-xl transition-all
        shadow-[0_0_24px_rgba(6,182,212,0.35)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-12 text-slate-400 text-sm font-semibold rounded-xl
        hover:bg-slate-900 hover:text-slate-200 active:scale-[0.98] transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      {children}
    </button>
  )
}
