import { useState } from 'react'
import { saveProfile } from '../lib/storage'
import type { UserProfile } from '../types'

interface Props {
  onComplete: () => void
}

export default function ProfileSetup({ onComplete }: Props) {
  const [height, setHeight] = useState('170')
  const [weight, setWeight] = useState('65')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleSubmit = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    const profile: UserProfile = {
      height: parseFloat(height),
      weight: parseFloat(weight),
      gender,
    }
    saveProfile(profile)
    onComplete()
  }

  const clearError = (key: string) =>
    setErrors(prev => ({ ...prev, [key]: '' }))

  return (
    <div className="flex flex-col min-h-screen px-4 pt-safe bg-slate-950">
      <div className="flex-1 flex flex-col justify-center gap-10">

        {/* Hero */}
        <div className="text-center">
          <div className="relative mx-auto w-20 h-20 mb-5">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-lg" />
            <div className="relative w-20 h-20 bg-slate-900 border border-cyan-500/30 rounded-3xl
              flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.15)]">
              <svg width="36" height="36" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                <path d="M22 28c-6 0-10-4.5-10-10V8h20v10c0 5.5-4 10-10 10Z" stroke="url(#pg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12H6a4 4 0 0 0 4 4" stroke="url(#pg)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M32 12h6a4 4 0 0 1-4 4" stroke="url(#pg)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 28v6" stroke="url(#pg)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M15 34h14" stroke="url(#pg)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="pg" x1="6" y1="8" x2="38" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22d3ee"/><stop offset="1" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">筋トレ記録</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            初回目標重量の算出のため
            <br />
            プロフィールを入力してください
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
                  onClick={() => setGender(g)}
                  aria-pressed={gender === g}
                  className={`h-12 rounded-xl text-sm font-semibold transition-all duration-100
                    active:scale-[0.97]
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="height" className="label-xs">身長</label>
            <div className="relative">
              <input
                id="height"
                type="number"
                value={height}
                onChange={e => { setHeight(e.target.value); clearError('height') }}
                inputMode="decimal"
                aria-invalid={!!errors.height}
                aria-describedby={errors.height ? 'height-error' : undefined}
                className={`w-full h-14 bg-slate-800 border rounded-xl px-4 text-xl font-semibold tabular-nums text-right pr-14
                  text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-shadow
                  ${errors.height ? 'border-red-400 ring-2 ring-red-400/40' : 'border-white/10'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none select-none">
                cm
              </span>
            </div>
            {errors.height && (
              <p id="height-error" className="text-red-400 text-xs">{errors.height}</p>
            )}
          </div>

          {/* 体重 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="weight" className="label-xs">体重</label>
            <div className="relative">
              <input
                id="weight"
                type="number"
                value={weight}
                onChange={e => { setWeight(e.target.value); clearError('weight') }}
                inputMode="decimal"
                aria-invalid={!!errors.weight}
                aria-describedby={errors.weight ? 'weight-error' : undefined}
                className={`w-full h-14 bg-slate-800 border rounded-xl px-4 text-xl font-semibold tabular-nums text-right pr-14
                  text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-shadow
                  ${errors.weight ? 'border-red-400 ring-2 ring-red-400/40' : 'border-white/10'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none select-none">
                kg
              </span>
            </div>
            {errors.weight && (
              <p id="weight-error" className="text-red-400 text-xs">{errors.weight}</p>
            )}
          </div>

        </div>
      </div>

      {/* CTA */}
      <div className="py-5 pb-safe">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600
            hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]
            text-white text-base font-bold rounded-xl transition-all
            shadow-[0_0_24px_rgba(6,182,212,0.35)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          はじめる
        </button>
      </div>
    </div>
  )
}
