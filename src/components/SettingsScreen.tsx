/**
 * SettingsScreen.tsx
 * 設定画面: プロフィール編集 / データ管理 / 表示設定 / アプリについて
 */

import { useState } from 'react'
import { getProfile, saveProfile, getAllRecords, clearAllData } from '../lib/storage'
import { getSettings, saveSettings, type WeekStart } from '../lib/settings'
import { exportToCsv } from '../lib/export'
import type { UserProfile } from '../types'

const APP_VERSION = '0.1.0'

interface Props {
  onBack: () => void
  /** データ全削除後にトップ（タイトル）へ戻す */
  onDataCleared: () => void
}

export default function SettingsScreen({ onBack, onDataCleared }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 px-4 pt-safe pb-3 bg-slate-950/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-cyan-400 hover:text-cyan-300 p-1 -ml-1 rounded-lg
              active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="戻る"
          >
            <BackIcon />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-white">設定</h1>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <ProfileSection />
        <DisplaySection />
        <DataSection onDataCleared={onDataCleared} />
        <AboutSection />
        <div className="pb-safe pb-6" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// プロフィール編集
// ─────────────────────────────────────────────────────────────────────────────

type Minutes = UserProfile['defaultMinutes']
const TIME_OPTIONS: Minutes[] = [30, 45, 60, 75]

function ProfileSection() {
  const current = getProfile()
  const [height,  setHeight]  = useState(String(current?.height  ?? 170))
  const [weight,  setWeight]  = useState(String(current?.weight  ?? 65))
  const [gender,  setGender]  = useState<UserProfile['gender']>(current?.gender ?? 'male')
  const [defaultCourse, setDefaultCourse] =
    useState<UserProfile['defaultCourse']>(current?.defaultCourse ?? 'hypertrophy')
  const [experienceLevel, setExperienceLevel] =
    useState<UserProfile['experienceLevel']>(current?.experienceLevel ?? 'beginner')
  const [defaultMinutes, setDefaultMinutes] =
    useState<Minutes>(current?.defaultMinutes ?? 45)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [saved,   setSaved]   = useState(false)

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (isNaN(h) || h < 100 || h > 250) errs.height = '100〜250 cm の範囲で入力してください'
    if (isNaN(w) || w < 20  || w > 300) errs.weight = '20〜300 kg の範囲で入力してください'
    return errs
  }

  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveProfile({
      height: parseFloat(height),
      weight: parseFloat(weight),
      gender,
      defaultCourse,
      experienceLevel,
      defaultMinutes,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const clearError = (key: string) => setErrors(prev => ({ ...prev, [key]: '' }))

  return (
    <SectionCard title="プロフィール">
      {/* 性別 */}
      <div className="space-y-2">
        <p className="label-xs">性別</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="性別選択">
          {(['male', 'female'] as const).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              className={`h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                ${gender === g
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:border-white/20'}`}
            >
              {g === 'male' ? '男性' : '女性'}
            </button>
          ))}
        </div>
      </div>

      {/* 身長 */}
      <NumberField
        id="settings-height"
        label="身長"
        value={height}
        unit="cm"
        error={errors.height}
        onChange={v => { setHeight(v); clearError('height') }}
      />

      {/* 体重 */}
      <NumberField
        id="settings-weight"
        label="体重"
        value={weight}
        unit="kg"
        error={errors.weight}
        onChange={v => { setWeight(v); clearError('weight') }}
      />

      {/* デフォルトコース */}
      <div className="space-y-2">
        <p className="label-xs">目的（デフォルトコース）</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="コース選択">
          {([
            { value: 'hypertrophy', label: '筋肥大' },
            { value: 'toning',      label: '引き締め' },
          ] as { value: UserProfile['defaultCourse']; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDefaultCourse(opt.value)}
              aria-pressed={defaultCourse === opt.value}
              className={`h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                ${defaultCourse === opt.value
                  ? (opt.value === 'toning' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20')
                  : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:border-white/20'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 経験レベル */}
      <div className="space-y-2">
        <p className="label-xs">経験レベル</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="経験レベル選択">
          {([
            { value: 'beginner',     label: '初心者' },
            { value: 'intermediate', label: '中級者' },
            { value: 'advanced',     label: '上級者' },
          ] as { value: UserProfile['experienceLevel']; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExperienceLevel(opt.value)}
              aria-pressed={experienceLevel === opt.value}
              className={`h-11 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                ${experienceLevel === opt.value
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:border-white/20'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 標準時間 */}
      <div className="space-y-2">
        <p className="label-xs">標準のトレーニング時間</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="標準時間選択">
          {TIME_OPTIONS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setDefaultMinutes(m)}
              aria-pressed={defaultMinutes === m}
              className={`h-11 rounded-xl text-sm font-bold transition-all active:scale-[0.97]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                ${defaultMinutes === m
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:border-white/20'}`}
            >
              {m}<span className="text-[10px] font-normal ml-0.5">分</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className={`w-full h-12 rounded-xl text-sm font-bold transition-all active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
          ${saved
            ? 'bg-emerald-500 text-white'
            : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-md shadow-cyan-500/20'}`}
      >
        {saved ? '✓ 保存しました' : '保存'}
      </button>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 表示設定
// ─────────────────────────────────────────────────────────────────────────────

function DisplaySection() {
  const [weekStart, setWeekStart] = useState<WeekStart>(getSettings().weekStart)
  const [saved, setSaved] = useState(false)

  const handleChange = (v: WeekStart) => {
    setWeekStart(v)
    saveSettings({ weekStart: v })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <SectionCard title="表示設定">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">週の始まり</p>
          {saved && <span className="text-xs text-emerald-400 font-semibold">✓ 保存</span>}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          週次集計の区切りに使用します（現バージョンでは月曜始まりの統計が既定）。
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="週の始まり選択">
          {([
            { value: 'monday', label: '月曜日' },
            { value: 'sunday', label: '日曜日' },
          ] as { value: WeekStart; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              aria-pressed={weekStart === opt.value}
              className={`h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                ${weekStart === opt.value
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:border-white/20'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// データ管理
// ─────────────────────────────────────────────────────────────────────────────

function DataSection({ onDataCleared }: { onDataCleared: () => void }) {
  const records = getAllRecords()
  const hasData = records.length > 0
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleExport = () => {
    exportToCsv(records)
  }

  const handleDeleteConfirm = () => {
    clearAllData()
    onDataCleared()
  }

  return (
    <SectionCard title="データ管理">
      {/* CSV エクスポート */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">CSV エクスポート</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasData ? `${records.length} 件のレコードをダウンロード` : 'まだ記録がありません'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!hasData}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
              disabled:opacity-40 disabled:cursor-not-allowed
              bg-slate-800 border border-white/10 text-cyan-400 hover:bg-slate-700 hover:border-white/20"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="border-t border-white/5 pt-3 space-y-3">
        {/* 削除確認 */}
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full h-11 rounded-xl text-sm font-semibold
              text-rose-400 border border-rose-500/30 bg-rose-500/10
              hover:bg-rose-500/15 hover:border-rose-500/40
              active:scale-[0.98] transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            データをすべて削除
          </button>
        ) : (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-rose-400">本当に削除しますか？</p>
            <p className="text-xs text-rose-400/80 leading-relaxed">
              プロフィール・すべてのトレーニング記録・設定が削除されます。この操作は元に戻せません。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 rounded-xl text-sm font-semibold
                  bg-slate-800 border border-rose-500/30 text-slate-300
                  hover:bg-slate-700 active:scale-[0.97] transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 h-10 rounded-xl text-sm font-bold
                  bg-rose-500 text-white hover:bg-rose-600
                  active:scale-[0.97] transition-all shadow-sm
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                削除する
              </button>
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed px-0.5">
          削除後はタイトル画面に戻り、プロフィールの再設定が必要です。
        </p>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// アプリについて
// ─────────────────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <SectionCard title="アプリについて">
      <div className="space-y-3">
        <Row label="バージョン" value={APP_VERSION} />
        <Row label="データ保存場所" value="端末内（LocalStorage）" />
      </div>
      <div className="border-t border-white/5 pt-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          表示される目安重量（1RM・初回推定値）は Epley 式および一般的な初心者基準値をもとにした
          <strong className="text-slate-300 font-semibold">参考値</strong>です。
          実際のトレーニングでは必ず余裕を持った重量から始め、体調に合わせて調整してください。
          本アプリは医療・健康指導の代替ではありません。
        </p>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 共通サブコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-4 py-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

function NumberField({
  id, label, value, unit, error, onChange,
}: {
  id: string; label: string; value: string; unit: string
  error?: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
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
          className={`w-full h-12 bg-slate-800 border rounded-xl px-4 pr-14
            text-base font-semibold tabular-nums text-right text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-shadow
            ${error ? 'border-red-400 ring-2 ring-red-400/40' : 'border-white/10'}`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none">
          {unit}
        </span>
      </div>
      {error && <p id={`${id}-error`} className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-300 tabular-nums">{value}</span>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
