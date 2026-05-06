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

  if (step === 'onboarding') {
    return <ProfileSetup onComplete={onEnterMain} />
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 px-6 pt-safe overflow-hidden">

      {/* 背景グロー */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -right-16 w-56 h-56 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-600/8 rounded-full blur-3xl" />
      </div>

      {/* 設定ボタン（右上） */}
      <div className="relative flex justify-end pt-4">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="設定を開く"
          className="p-2 text-slate-500 hover:text-cyan-400 rounded-xl
            active:scale-95 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <GearIcon />
        </button>
      </div>

      {/* ヒーロー */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-8 text-center pb-8">
        <div className="space-y-5">
          {/* ロゴ */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-cyan-500/25 rounded-[2rem] blur-xl" />
            <div className="relative w-24 h-24 bg-slate-900 border border-cyan-500/30 rounded-[2rem]
              flex items-center justify-center shadow-[0_0_32px_rgba(6,182,212,0.2)]">
              <TrophyIcon />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">筋トレ記録</h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              重量・レップ数を記録して<br />
              自分だけの成長データを積み上げよう
            </p>
          </div>
        </div>

        {/* 特徴リスト */}
        <ul className="space-y-2 text-left w-full max-w-xs">
          {[
            'ジム初日でも迷わない、種目ごとの解説つき',
            '考えなくてOK。今日のメニューが自動で表示',
            'あなたの体に合わせた最適な重量を提示',
            'カレンダーとグラフで成長を可視化',
          ].map(text => (
            <li key={text}
              className="flex items-center gap-3 bg-slate-900/70 border border-white/10
                rounded-2xl px-4 py-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" aria-hidden="true" />
              <span className="text-sm text-slate-300">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="relative py-6 pb-safe space-y-3">
        <button
          type="button"
          onClick={handleStart}
          className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600
            hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]
            text-white text-base font-bold rounded-2xl transition-all
            shadow-[0_0_24px_rgba(6,182,212,0.4)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          はじめる
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full h-11 text-slate-500 text-sm font-semibold rounded-2xl
            hover:bg-slate-900 hover:text-slate-300 active:scale-[0.98] transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          設定
        </button>
      </div>
    </div>
  )
}

function TrophyIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path
        d="M22 28c-6 0-10-4.5-10-10V8h20v10c0 5.5-4 10-10 10Z"
        stroke="url(#tg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M12 12H6a4 4 0 0 0 4 4" stroke="url(#tg)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 12h6a4 4 0 0 1-4 4" stroke="url(#tg)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 28v6" stroke="url(#tg)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 34h14" stroke="url(#tg)" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="tg" x1="6" y1="8" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/>
          <stop offset="1" stopColor="#3b82f6"/>
        </linearGradient>
      </defs>
    </svg>
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
