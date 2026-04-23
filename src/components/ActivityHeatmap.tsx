/**
 * ActivityHeatmap.tsx
 * 活動カレンダー: ボリューム Σ(weight × reps) で着色するヒートマップ
 */

import { useState, useMemo } from 'react'
import { getAllRecords } from '../lib/storage'
import {
  buildMonthlyHeatmap,
  calcHeatmapStats,
  type DayData,
  type MonthData,
} from '../lib/heatmap'

// ─────────────────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────────────────

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

/** 強度レベル → Tailwind クラス */
const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-slate-100 border border-slate-200',
  1: 'bg-sky-200',
  2: 'bg-sky-400',
  3: 'bg-sky-600',
  4: 'bg-sky-800',
}

const MONTH_OPTIONS = [
  { value: 3, label: '3ヶ月' },
  { value: 6, label: '6ヶ月' },
] as const
type MonthCount = 3 | 6

// ─────────────────────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export default function ActivityHeatmap({ onBack }: Props) {
  const [monthCount, setMonthCount] = useState<MonthCount>(3)

  const records = useMemo(() => getAllRecords(), [])
  const monthData = useMemo(
    () => buildMonthlyHeatmap(records, monthCount),
    [records, monthCount],
  )
  const stats = useMemo(() => calcHeatmapStats(monthData), [monthData])

  return (
    <div className="flex flex-col min-h-screen bg-sky-50">

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 px-4 pt-safe pb-3 bg-white/95 backdrop-blur-sm border-b border-sky-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-sky-600 hover:text-sky-700 p-1 -ml-1 rounded-lg
                active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="戻る"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">活動カレンダー</h1>
          </div>

          {/* 期間切り替え */}
          <div className="flex gap-1 bg-sky-50 rounded-xl p-1 border border-sky-100">
            {MONTH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMonthCount(opt.value)}
                aria-pressed={monthCount === opt.value}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                  ${monthCount === opt.value
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* スクロールコンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* サマリー統計 */}
        <StatsRow stats={stats} monthCount={monthCount} />

        {/* 月別カレンダー */}
        {monthData.map(m => (
          <MonthCalendar key={`${m.year}-${m.month}`} month={m} />
        ))}

        {/* 凡例 */}
        <Legend />

        <div className="pb-safe pb-4" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatsRow
// ─────────────────────────────────────────────────────────────────────────────

function StatsRow({
  stats, monthCount,
}: {
  stats: ReturnType<typeof calcHeatmapStats>
  monthCount: number
}) {
  const volumeLabel = stats.totalVolume >= 1000
    ? `${(stats.totalVolume / 1000).toFixed(1)}t`
    : `${stats.totalVolume}kg`

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label={`直近${monthCount}ヶ月`}
        value={String(stats.activeDays)}
        unit="日トレ"
      />
      <StatCard
        label="総ボリューム"
        value={volumeLabel}
        unit=""
      />
      <StatCard
        label="最大/日"
        value={stats.maxDayVolume >= 1000
          ? `${(stats.maxDayVolume / 1000).toFixed(1)}t`
          : `${stats.maxDayVolume}kg`}
        unit=""
      />
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white border border-sky-100 rounded-2xl px-3 py-3 shadow-sm text-center">
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-tight">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums leading-none">
        {value}
        {unit && <span className="text-xs font-normal text-slate-500 ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MonthCalendar
// ─────────────────────────────────────────────────────────────────────────────

function MonthCalendar({ month }: { month: MonthData }) {
  return (
    <div className="bg-white border border-sky-100 rounded-2xl shadow-sm overflow-hidden">
      {/* 月ラベル */}
      <div className="px-4 py-3 border-b border-sky-50">
        <p className="text-sm font-bold text-slate-700">{month.label}</p>
      </div>

      <div className="px-3 py-3">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1.5">
          {DOW_LABELS.map(dow => (
            <p key={dow} className="text-center text-[10px] text-slate-400 font-semibold">{dow}</p>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {/* 月の1日までの空白パッド */}
          {Array.from({ length: month.startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {/* 各日 */}
          {month.days.map(day => (
            <DayCell key={day.dateKey} day={day} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DayCell
// ─────────────────────────────────────────────────────────────────────────────

function DayCell({ day }: { day: DayData }) {
  const today = new Date()
  const isToday =
    day.date.getFullYear() === today.getFullYear() &&
    day.date.getMonth()    === today.getMonth() &&
    day.date.getDate()     === today.getDate()

  const volLabel = day.volume >= 1000
    ? `${(day.volume / 1000).toFixed(1)}t`
    : day.volume > 0
      ? `${day.volume}kg`
      : ''

  const titleText = [
    day.volume > 0 ? `${day.dateKey} ${volLabel}` : day.dateKey,
    day.hasQuick ? '（お任せ実施）' : '',
  ].join('')

  return (
    <div
      className={`aspect-square rounded-lg flex flex-col items-center justify-center relative
        ${LEVEL_CLASSES[day.level]}
        ${isToday ? 'ring-2 ring-sky-500 ring-offset-1' : ''}
        `}
      title={titleText}
      aria-label={`${day.date.getDate()}日${day.volume > 0 ? ` ボリューム${volLabel}` : ''}${day.hasQuick ? ' お任せ実施' : ''}`}
    >
      <span className={`text-[9px] leading-none font-semibold tabular-nums
        ${day.level === 0 ? 'text-slate-300' : day.level <= 2 ? 'text-sky-900' : 'text-white'}`}>
        {day.date.getDate()}
      </span>
      {day.hasQuick && (
        <div
          className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="bg-white border border-sky-100 rounded-2xl shadow-sm px-4 py-3">
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
        強度（ボリューム / 日）
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <LegendItem level={0} label="未トレ" />
        <LegendItem level={1} label="〜2,499 kg" />
        <LegendItem level={2} label="〜4,999 kg" />
        <LegendItem level={3} label="〜9,999 kg" />
        <LegendItem level={4} label="10,000 kg〜" />
      </div>
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-sky-50">
        <div className="relative w-4 h-4 rounded bg-sky-200">
          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
        </div>
        <span className="text-[10px] text-slate-500">お任せ実施日</span>
      </div>
    </div>
  )
}

function LegendItem({ level, label }: { level: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-4 rounded ${LEVEL_CLASSES[level]}`} aria-hidden="true" />
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  )
}
