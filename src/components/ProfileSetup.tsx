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
    <div className="flex flex-col min-h-screen px-4 pt-safe bg-white">
      <div className="flex-1 flex flex-col justify-center gap-10">

        {/* Hero */}
        <div className="text-center">
          <div className="w-20 h-20 bg-sky-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl" role="img" aria-label="ダンベル">🏋️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">筋トレ記録</h1>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
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
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
                    ${gender === g
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                      : 'bg-sky-50 text-slate-600 border border-sky-200 hover:bg-sky-100 hover:border-sky-300'
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
                className={`w-full h-14 bg-white border rounded-xl px-4 text-xl font-semibold tabular-nums text-right pr-14
                  text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-shadow
                  ${errors.height ? 'border-red-400 ring-2 ring-red-400/40' : 'border-sky-200'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none select-none">
                cm
              </span>
            </div>
            {errors.height && (
              <p id="height-error" className="text-red-500 text-xs">{errors.height}</p>
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
                className={`w-full h-14 bg-white border rounded-xl px-4 text-xl font-semibold tabular-nums text-right pr-14
                  text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-shadow
                  ${errors.weight ? 'border-red-400 ring-2 ring-red-400/40' : 'border-sky-200'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none select-none">
                kg
              </span>
            </div>
            {errors.weight && (
              <p id="weight-error" className="text-red-500 text-xs">{errors.weight}</p>
            )}
          </div>

        </div>
      </div>

      {/* CTA */}
      <div className="py-5 pb-safe">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-14 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 active:scale-[0.98]
            text-white text-base font-bold rounded-xl transition-all
            shadow-lg shadow-sky-500/25
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          はじめる
        </button>
      </div>
    </div>
  )
}
