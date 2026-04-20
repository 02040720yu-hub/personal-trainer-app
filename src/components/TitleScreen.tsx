/**
 * TitleScreen.tsx
 * アプリの入口画面。プロフィール未設定時のみ表示。
 * 設定済みユーザーはメイン直入り（App.tsx で制御）。
 */

import { useState } from 'react'
import { getProfile } from '../lib/storage'
import ProfileSetup from './ProfileSetup'

interface Props {
  onEnterMain: () => void
  onOpenSettings: () => void
}

export default function TitleScreen({ onEnterMain, onOpenSettings }: Props) {
  const [step, setStep] = useState<'landing' | 'onboarding'>('landing')

  const handleStart = () => {
    if (getProfile()) {
      onEnterMain()
    } else {
      setStep('onboarding')
    }
  }

  // オンボーディング（初回プロフィール設定）
  if (step === 'onboarding') {
    return <ProfileSetup onComplete={onEnterMain} />
  }

  // タイトル / ランディング
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-safe">

      {/* 設定ボタン（右上） */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="設定を開く"
          className="p-2 text-slate-400 hover:text-sky-600 rounded-xl
            active:scale-95 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <GearIcon />
        </button>
      </div>

      {/* ヒーロー */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center pb-8">
        <div className="space-y-4">
          <div className="w-24 h-24 bg-sky-100 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
            <span className="text-5xl" role="img" aria-label="ダンベル">🏋️</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">筋トレ記録</h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              重量・レップ数を記録して<br />
              自分だけの成長データを積み上げよう
            </p>
          </div>
        </div>

        {/* 特徴リスト */}
        <ul className="space-y-2.5 text-left w-full max-w-xs">
          {[
            { icon: '📊', text: '1RM を自動計算・次回目標を提示' },
            { icon: '⚡', text: 'お任せコースで時間に合わせた自動プラン' },
            { icon: '📅', text: '活動カレンダーで継続を可視化' },
            { icon: '📤', text: 'CSV エクスポートでデータを持ち出し' },
          ].map(f => (
            <li key={f.icon} className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">{f.icon}</span>
              <span className="text-sm text-slate-600">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="py-6 pb-safe space-y-3">
        <button
          type="button"
          onClick={handleStart}
          className="w-full h-14 bg-sky-500 hover:bg-sky-600 active:scale-[0.98]
            text-white text-base font-bold rounded-2xl transition-all
            shadow-lg shadow-sky-500/25
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          はじめる
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full h-11 text-slate-500 text-sm font-semibold rounded-2xl
            hover:bg-slate-50 active:scale-[0.98] transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          設定
        </button>
      </div>
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M17.7 13.7a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 0 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V19a1.8 1.8 0 0 1-3.6 0v-.06A1.5 1.5 0 0 0 8.35 17.7a1.5 1.5 0 0 0-1.65.3l-.05.05a1.8 1.8 0 0 1-2.55-2.55l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H3a1.8 1.8 0 0 1 0-3.6h.06A1.5 1.5 0 0 0 4.3 8.35a1.5 1.5 0 0 0-.3-1.65l-.05-.05a1.8 1.8 0 0 1 2.55-2.55l.05.05a1.5 1.5 0 0 0 1.65.3h.07A1.5 1.5 0 0 0 9.17 3V3a1.8 1.8 0 0 1 3.6 0v.06a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 0 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.38.9H19a1.8 1.8 0 0 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.9h.14Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
