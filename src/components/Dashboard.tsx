import { useState, useMemo } from 'react'
import type { WorkoutRecord } from '../types'
import { getAllRecords } from '../lib/storage'
import { loadGoals, saveGoals, type WeeklyGoals } from '../lib/goals'
import { exportToCsv } from '../lib/export'
import { BODY_PARTS, EXERCISES, getExerciseById } from '../data/exercises'
import type { Exercise } from '../types'
import {
  getWeekStart,
  getMonthStart,
  filterByRange,
  countUniqueDays,
  countTotalSets,
  countTotalReps,
  calcVolume,
  calcStreak,
  countThisMonthSessions,
  countByBodyPart,
  comparePeriod,
  compareVolume,
  calcPRs,
  getWeeklyPoints,
  getTrendingExercises,
  buildHeatmap,
  type WeeklyPoint,
  type HeatDay,
  type VolumeComparison,
  type PeriodComparison,
} from '../lib/analytics'

type DashTab = 'summary' | 'progress' | 'calendar'
type Period  = 'week' | 'month'
type Metric  = 'oneRM' | 'weight' | 'volume'

interface Props {
  onBack: () => void
}

// ────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ onBack }: Props) {
  const [tab, setTab]               = useState<DashTab>('summary')
  const [progressPeriod, setProgressPeriod] = useState<Period>('week')

  const records = getAllRecords()
  const now     = new Date()

  const weekStart     = getWeekStart(now)
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000)
  const weekRecs      = filterByRange(records, weekStart, now)
  const prevWeekRecs  = filterByRange(records, prevWeekStart, weekStart)
  const streak        = calcStreak(records)
  const monthSessions = countThisMonthSessions(records)
  const volComp       = compareVolume(records)
  const weekComp      = comparePeriod(records, 'week')

  const TABS: { id: DashTab; label: string }[] = [
    { id: 'summary',  label: 'サマリー' },
    { id: 'progress', label: '推移・PR'  },
    { id: 'calendar', label: 'カレンダー' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">

      {/* ── スティッキーヘッダー ── */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-white/10 px-4 pt-safe">
        <div className="flex items-center justify-between py-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-medium
              transition-colors -ml-1 px-1 py-1 rounded-lg
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            ← お任せへ
          </button>
          <h1 className="text-base font-bold text-white">統計・ダッシュボード</h1>
          <button
            type="button"
            onClick={() => exportToCsv(records)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-slate-900 hover:bg-slate-800
              border border-white/10 rounded-lg px-3 py-1.5 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="CSV でエクスポート"
          >
            CSV
          </button>
        </div>

        {/* タブナビ */}
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-inset
                ${tab === t.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div className="flex-1 px-4 py-4 pb-10 space-y-4">

        {/* 期間切替: 推移・PR タブのみ表示 */}
        {tab === 'progress' && (
          <div className="flex bg-slate-900 rounded-xl p-1 gap-1 border border-white/10">
            {(['week', 'month'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setProgressPeriod(p)}
                className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                  ${progressPeriod === p
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {p === 'week' ? '今週' : '今月'}
              </button>
            ))}
          </div>
        )}

        {tab === 'summary' && (
          <SummaryTab
            weekRecs={weekRecs}
            prevWeekRecs={prevWeekRecs}
            streak={streak}
            monthSessions={monthSessions}
            volComp={volComp}
            weekComp={weekComp}
            allRecords={records}
          />
        )}

        {tab === 'progress' && (
          <ProgressTab allRecords={records} period={progressPeriod} />
        )}

        {tab === 'calendar' && (
          <CalendarTab allRecords={records} />
        )}

      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// サマリータブ
// ────────────────────────────────────────────────────────────────────────────

interface SummaryTabProps {
  weekRecs:      WorkoutRecord[]
  prevWeekRecs:  WorkoutRecord[]
  streak:        number
  monthSessions: number
  volComp:       VolumeComparison
  weekComp:      PeriodComparison
  allRecords:    WorkoutRecord[]
}

function SummaryTab({
  weekRecs, prevWeekRecs, streak, monthSessions,
  volComp, weekComp, allRecords,
}: SummaryTabProps) {
  const days    = countUniqueDays(weekRecs)
  const sets    = countTotalSets(weekRecs)
  const bodyMap = countByBodyPart(weekRecs)

  const pctLabel = (comp: PeriodComparison) => {
    if (comp.pct === null) return '—'
    const sign = comp.pct >= 0 ? '+' : ''
    return `${sign}${comp.pct}%`
  }
  const pctColor = (comp: PeriodComparison) =>
    comp.pct === null ? 'text-slate-500'
    : comp.pct > 0    ? 'text-emerald-500'
    : comp.pct < 0    ? 'text-red-400'
    : 'text-slate-400'

  return (
    <>
      {/* 今日のステータス（最優先） */}
      <TodayStatus allRecords={allRecords} />

      {/* 3つのキー指標（ストリーク優先） */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="ストリーク"
          value={String(streak)}
          unit="日連続"
          highlight
        />
        <StatCard
          label="今週の実施日数"
          value={String(days)}
          unit="日"
          sub={`先週 ${countUniqueDays(prevWeekRecs)} 日`}
        />
        <StatCard
          label="今週のセット数"
          value={String(sets)}
          unit="セット"
          sub={
            <span className={pctColor(weekComp)}>
              {pctLabel(weekComp)}
            </span>
          }
        />
        <StatCard
          label="今月の回数"
          value={String(monthSessions)}
          unit="セッション"
        />
      </div>

      {/* 部位別回数（今週） */}
      <SectionCard title="今週の部位別セッション数">
        {bodyMap.size === 0 ? (
          <EmptyInCard text="今週の記録がありません" />
        ) : (
          <BodyPartBars bodyMap={bodyMap} />
        )}
      </SectionCard>

      {/* ボリューム比較 */}
      <SectionCard title="週間ボリューム（今週 vs 先週）">
        <VolumeCard volComp={volComp} />
      </SectionCard>

      {/* 週次目標 */}
      <WeeklyGoalCard allRecords={allRecords} />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 推移・PR タブ
// ────────────────────────────────────────────────────────────────────────────

function ProgressTab({ allRecords, period }: { allRecords: ReturnType<typeof getAllRecords>; period: Period }) {
  const exercisesWithData = useMemo(() => {
    const ids = [...new Set(allRecords.map(r => r.exerciseId))]
    return ids
      .map(id => getExerciseById(id))
      .filter((e): e is Exercise => e !== undefined)
  }, [allRecords])

  const [selectedId, setSelectedId] = useState<string>(
    exercisesWithData[0]?.id ?? ''
  )
  const [metric, setMetric] = useState<Metric>('oneRM')

  const weeklyPts = useMemo(
    () => selectedId ? getWeeklyPoints(allRecords, selectedId, 8) : [],
    [allRecords, selectedId]
  )

  const trending = useMemo(
    () => getTrendingExercises(allRecords, 8),
    [allRecords]
  )

  const prs = useMemo(() => calcPRs(allRecords), [allRecords])

  return (
    <>
      {/* 種目別推移チャート */}
      <SectionCard title="種目別推移（直近8週）">
        {exercisesWithData.length === 0 ? (
          <EmptyInCard text="記録がありません" />
        ) : (
          <>
            {/* 種目セレクタ */}
            <div className="mb-3">
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full h-10 bg-slate-800 border border-white/10 rounded-lg text-sm text-white
                  px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                aria-label="種目を選択"
              >
                {exercisesWithData.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>

            {/* メトリクス切替 */}
            <div className="flex gap-1 mb-3">
              {([
                { id: 'oneRM'  as Metric, label: '推定 1RM' },
                { id: 'weight' as Metric, label: '最大重量' },
                { id: 'volume' as Metric, label: 'ボリューム' },
              ]).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  className={`flex-1 h-7 rounded-lg text-xs font-medium transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                    ${metric === m.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-800 text-slate-400 border border-white/10 hover:bg-slate-700'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <WeeklyLineChart points={weeklyPts} metric={metric} />
          </>
        )}
      </SectionCard>

      {/* 右肩上がり種目 */}
      <SectionCard title="伸びている種目（直近8週）">
        {trending.length === 0 ? (
          <EmptyInCard text="直近8週の比較データが不足しています" />
        ) : (
          <div className="flex flex-col gap-2">
            {trending.slice(0, 5).map(t => {
              const ex = getExerciseById(t.exerciseId)
              return (
                <div key={t.exerciseId} className="flex items-center justify-between py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ex?.name ?? t.exerciseId}</p>
                    <p className="text-xs text-slate-500 tabular-nums">最新 1RM {t.latestOneRM.toFixed(1)} kg</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums ml-3">
                    +{t.delta.toFixed(1)} kg
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* PR ハイライト */}
      <SectionCard title="自己ベスト（全期間）">
        {prs.size === 0 ? (
          <EmptyInCard text="記録がありません" />
        ) : (
          <div className="flex flex-col gap-2">
            {[...prs.entries()]
              .sort((a, b) => b[1].maxOneRM - a[1].maxOneRM)
              .slice(0, 8)
              .map(([id, pr]) => {
                const ex = getExerciseById(id)
                return (
                  <div key={id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <p className="text-sm text-slate-300 truncate flex-1">{ex?.name ?? id}</p>
                    <div className="flex items-center gap-3 ml-2 shrink-0 text-xs tabular-nums">
                      <span className="text-cyan-400 font-bold">{pr.maxOneRM.toFixed(1)} kg</span>
                      <span className="text-slate-500">{pr.maxWeight} kg</span>
                    </div>
                  </div>
                )
              })
            }
            <p className="text-[10px] text-slate-500 mt-1 text-right">左: 推定 1RM / 右: 最大重量</p>
          </div>
        )}
      </SectionCard>
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// カレンダータブ
// ────────────────────────────────────────────────────────────────────────────

function CalendarTab({ allRecords }: { allRecords: ReturnType<typeof getAllRecords> }) {
  const heatDays = useMemo(() => buildHeatmap(allRecords, 3), [allRecords])

  const months = useMemo(() => {
    const map = new Map<string, HeatDay[]>()
    heatDays.forEach(d => {
      const key = `${d.date.getFullYear()}-${d.date.getMonth()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    })
    return [...map.entries()]
      .map(([key, days]) => {
        const [y, m] = key.split('-').map(Number)
        return { year: y, month: m, days }
      })
      .sort((a, b) => a.year - b.year || a.month - b.month)
  }, [heatDays])

  const maxCount = useMemo(
    () => Math.max(...heatDays.map(d => d.count), 1),
    [heatDays]
  )

  return (
    <>
      <SectionCard title="トレ日ヒートマップ（直近3ヶ月）">
        <div className="flex flex-col gap-5">
          {months.map(({ year, month, days }) => (
            <MonthHeatmap
              key={`${year}-${month}`}
              year={year}
              month={month}
              days={days}
              maxCount={maxCount}
            />
          ))}
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-[10px] text-slate-500">少</span>
          {['bg-slate-800 border border-slate-700', 'bg-cyan-900', 'bg-cyan-600', 'bg-cyan-400'].map(cls => (
            <div key={cls} className={`w-4 h-4 rounded-sm ${cls}`} />
          ))}
          <span className="text-[10px] text-slate-500">多</span>
        </div>
      </SectionCard>
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 月カレンダー（ヒートマップ1ヶ月分）
// ────────────────────────────────────────────────────────────────────────────

function MonthHeatmap({
  year, month, days, maxCount,
}: { year: number; month: number; days: HeatDay[]; maxCount: number }) {
  const getColorCls = (count: number) => {
    if (count === 0) return 'bg-slate-800 border border-slate-700'
    const ratio = count / maxCount
    if (ratio < 0.34) return 'bg-cyan-900'
    if (ratio < 0.67) return 'bg-cyan-600'
    return 'bg-cyan-400'
  }

  const firstDay   = new Date(year, month, 1)
  const rawDay     = firstDay.getDay()
  const startPad   = rawDay === 0 ? 6 : rawDay - 1

  const DOW = ['月', '火', '水', '木', '金', '土', '日']

  return (
    <div>
      <p className="text-xs font-semibold text-cyan-400 mb-2">
        {year}年 {month + 1}月
      </p>
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-500">{d}</div>
        ))}
      </div>
      {/* 日マス */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }, (_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {days.map(day => (
          <div
            key={day.date.toDateString()}
            title={`${month + 1}/${day.date.getDate()}: ${day.count} セッション`}
            className={`aspect-square rounded-sm ${getColorCls(day.count)}`}
          />
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 折れ線チャート（SVG）
// ────────────────────────────────────────────────────────────────────────────

const SVG_W = 300, SVG_H = 140
const PAD = { t: 16, r: 12, b: 28, l: 44 }
const PLOT_W = SVG_W - PAD.l - PAD.r
const PLOT_H = SVG_H - PAD.t - PAD.b

function toSvgX(i: number, n: number): number {
  return PAD.l + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W)
}
function toSvgY(v: number, min: number, range: number): number {
  return PAD.t + PLOT_H - ((v - min) / (range || 1)) * PLOT_H
}

function WeeklyLineChart({ points, metric }: { points: WeeklyPoint[]; metric: Metric }) {
  const getValue = (p: WeeklyPoint) => {
    if (!p.hasData) return null
    if (metric === 'oneRM')   return p.maxOneRM
    if (metric === 'weight')  return p.maxWeight
    return p.volume
  }

  const values = points.map(getValue)
  const dataValues = values.filter((v): v is number => v !== null)

  if (dataValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-sm text-slate-500">
        この種目の記録がありません
      </div>
    )
  }

  const minV  = Math.min(...dataValues)
  const maxV  = Math.max(...dataValues)
  const range = maxV - minV

  type Pt = { x: number; y: number; idx: number }
  const segments: Pt[][] = []
  let cur: Pt[] = []

  points.forEach((p, i) => {
    const v = getValue(p)
    if (v !== null) {
      cur.push({ x: toSvgX(i, points.length), y: toSvgY(v, minV, range), idx: i })
    } else if (cur.length > 0) {
      segments.push(cur)
      cur = []
    }
  })
  if (cur.length > 0) segments.push(cur)

  const unit = metric === 'volume' ? 'kg·rep' : 'kg'

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        role="img"
        aria-label={`直近8週の${metric}推移`}
      >
        {/* グリッド線（3本） */}
        {[0, 0.5, 1].map(t => {
          const y = PAD.t + PLOT_H * (1 - t)
          const v = minV + range * t
          return (
            <g key={t}>
              <line x1={PAD.l} y1={y} x2={SVG_W - PAD.r} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={PAD.l - 4} y={y + 3.5} textAnchor="end" fontSize="8" fill="#475569">
                {v.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* X軸ラベル */}
        {points.map((p, i) => {
          if (i % 2 !== 0 && i !== points.length - 1) return null
          return (
            <text
              key={i}
              x={toSvgX(i, points.length)}
              y={SVG_H - 4}
              textAnchor="middle"
              fontSize="8"
              fill={p.hasData ? '#64748b' : '#334155'}
            >
              {p.weekLabel}
            </text>
          )
        })}

        {/* ライン */}
        {segments.map((seg, si) =>
          seg.length === 1 ? null : (
            <polyline
              key={si}
              points={seg.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )
        )}

        {/* データ点 */}
        {segments.flat().map(p => (
          <circle key={p.idx} cx={p.x} cy={p.y} r="3.5" fill="#22d3ee" />
        ))}
      </svg>

      {/* 最新値サマリー */}
      {(() => {
        const lastPt = [...points].reverse().find(p => p.hasData)
        if (!lastPt) return null
        const v = getValue(lastPt)
        return (
          <p className="text-xs text-slate-500 mt-1 text-right tabular-nums">
            最新: {v?.toFixed(metric === 'volume' ? 0 : 1)} {unit}
          </p>
        )
      })()}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ボリューム比較カード
// ────────────────────────────────────────────────────────────────────────────

function VolumeCard({ volComp }: { volComp: VolumeComparison }) {
  const labelMap: Record<string, { text: string; cls: string }> = {
    heavy:   { text: '先週より重め', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    light:   { text: '先週より軽め',    cls: 'text-amber-400  bg-amber-500/10  border-amber-500/30'  },
    same:    { text: '先週とほぼ同じ',  cls: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/30'    },
    'no-data': { text: '前週データなし', cls: 'text-slate-400  bg-slate-800     border-white/10' },
  }
  const info = labelMap[volComp.label]

  const fmtKg = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${v.toFixed(0)} kg`

  return (
    <div>
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3 ${info.cls}`}>
        {info.text}
      </div>
      <div className="flex gap-4 tabular-nums">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">今週</p>
          <p className="text-xl font-bold text-white">{fmtKg(volComp.thisWeek)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">先週</p>
          <p className="text-xl font-bold text-slate-500">{fmtKg(volComp.lastWeek)}</p>
        </div>
        {volComp.ratio !== null && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">比率</p>
            <p className={`text-xl font-bold ${volComp.ratio >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(volComp.ratio * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 部位別棒グラフ
// ────────────────────────────────────────────────────────────────────────────

function BodyPartBars({ bodyMap }: { bodyMap: Map<string, number> }) {
  const max = Math.max(...bodyMap.values(), 1)
  const all = BODY_PARTS.map(bp => ({
    ...bp,
    count: bodyMap.get(bp.id) ?? 0,
  })).filter(bp => bp.count > 0)

  if (all.length === 0) return <EmptyInCard text="記録がありません" />

  return (
    <div className="flex flex-col gap-2.5">
      {all
        .sort((a, b) => b.count - a.count)
        .map(bp => (
          <div key={bp.id} className="flex items-center gap-3">
            <span className="text-xs text-slate-300 w-16 shrink-0">{bp.label}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${(bp.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300 tabular-nums w-6 text-right">
              {bp.count}
            </span>
          </div>
        ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 週次目標カード
// ────────────────────────────────────────────────────────────────────────────

function WeeklyGoalCard({ allRecords }: { allRecords: ReturnType<typeof getAllRecords> }) {
  const [goals, setGoals]   = useState<WeeklyGoals>(loadGoals)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<WeeklyGoals>(goals)

  const now   = new Date()
  const start = getWeekStart(now)
  const thisWeek = filterByRange(allRecords, start, now)

  const actualSets = countTotalSets(thisWeek)
  const actualReps = countTotalReps(thisWeek)

  const handleSave = () => {
    saveGoals(draft)
    setGoals(draft)
    setEditing(false)
  }

  const hasGoal = goals.targetSets > 0 || goals.targetReps > 0

  return (
    <SectionCard title="今週の目標">
      {editing ? (
        <div className="flex flex-col gap-4">
          <GoalInput
            label="目標セット数"
            value={draft.targetSets}
            unit="セット"
            onChange={v => setDraft(d => ({ ...d, targetSets: v }))}
          />
          <GoalInput
            label="目標総レップ数"
            value={draft.targetReps}
            unit="回"
            onChange={v => setDraft(d => ({ ...d, targetReps: v }))}
          />
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 h-10 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white text-sm font-semibold
                rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => { setDraft(goals); setEditing(false) }}
              className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-sm font-medium
                rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <>
          {!hasGoal ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-sm text-slate-500">目標を設定すると進捗が表示されます</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-cyan-400 font-semibold hover:text-cyan-300 underline underline-offset-2"
              >
                目標を設定する
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {goals.targetSets > 0 && (
                <GoalProgressBar
                  label="セット数"
                  current={actualSets}
                  target={goals.targetSets}
                />
              )}
              {goals.targetReps > 0 && (
                <GoalProgressBar
                  label="総レップ数"
                  current={actualReps}
                  target={goals.targetReps}
                />
              )}
              <button
                type="button"
                onClick={() => { setDraft(goals); setEditing(true) }}
                className="self-end text-xs text-cyan-400 font-medium hover:text-cyan-300"
              >
                編集
              </button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

function GoalInput({
  label, value, unit, onChange,
}: { label: string; value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label-xs">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value === 0 ? '' : value}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            onChange(isNaN(v) || v < 0 ? 0 : v)
          }}
          inputMode="numeric"
          placeholder="0"
          className="w-full h-12 bg-slate-800 border border-white/10 rounded-xl px-4 pr-14 text-right
            text-lg font-semibold tabular-nums text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
          {unit}
        </span>
      </div>
    </div>
  )
}

function GoalProgressBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = Math.min(1, target > 0 ? current / target : 0)
  const done = pct >= 1

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${done ? 'text-emerald-400' : 'text-cyan-400'}`}>
          {current} / {target}
          {done && ' ✓'}
        </span>
      </div>
      <div className="h-2 bg-slate-800 border border-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : 'bg-cyan-400'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 今日のステータスカード
// ────────────────────────────────────────────────────────────────────────────

function TodayStatus({ allRecords }: { allRecords: WorkoutRecord[] }) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}/${today.getMonth()}/${today.getDate()}`

  const todayRecs = allRecords.filter(r => {
    const d = new Date(r.date)
    return `${d.getFullYear()}/${d.getMonth()}/${d.getDate()}` === todayStr
  })

  const trainedToday = todayRecs.length > 0
  const quickToday   = todayRecs.some(r => r.source === 'quick')

  if (!trainedToday) {
    return (
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">今日はまだトレーニングしていません</p>
          <p className="text-xs text-slate-400 mt-0.5">お任せコースで今日の分を始めましょう</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M4 9L7.5 12.5L14 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold">今日のトレーニング完了</p>
        <p className="text-xs text-cyan-100 mt-0.5">
          {quickToday ? 'お任せコースで実施済み' : '手動で実施済み'}
          {todayRecs.length > 1 && `（${todayRecs.length} 種目）`}
        </p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 共通 UI 部品
// ────────────────────────────────────────────────────────────────────────────

function StatCard({
  label, value, unit, sub, highlight,
}: {
  label: string; value: string; unit: string
  sub?: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className={`bg-slate-900 border rounded-2xl p-4 ${highlight ? 'border-cyan-500/40' : 'border-white/10'}`}>
      <p className="label-xs mb-1.5">{label}</p>
      <p className={`text-3xl font-bold tabular-nums leading-none ${highlight ? 'text-cyan-400' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1">{unit}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
      <p className="label-xs mb-3">{title}</p>
      {children}
    </div>
  )
}

function EmptyInCard({ text }: { text: string }) {
  return (
    <p className="text-sm text-slate-500 text-center py-4">{text}</p>
  )
}
