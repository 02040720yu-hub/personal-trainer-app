import { BODY_PARTS, EXERCISES } from '../data/exercises'
import { getAllRecords } from '../lib/storage'
import type { BodyPart } from '../types'

interface Props {
  onSelect: (bodyPart: BodyPart) => void
  onHistoryClick: () => void
  onDashboardClick: () => void
  onQuickClick: () => void
  onHeatmapClick: () => void
  onSettingsClick: () => void
  onTitleClick: () => void
}

export default function BodyPartSelector({ onSelect, onHistoryClick, onDashboardClick, onQuickClick, onHeatmapClick, onSettingsClick, onTitleClick }: Props) {
  const totalSessions = getAllRecords().length

  return (
    <div className="flex flex-col min-h-screen bg-sky-50">

      {/* ヘッダー */}
      <div className="px-4 pt-safe pb-3 bg-white border-b border-sky-100">

        {/* 上段: トップへ戻るボタン */}
        <div className="pt-2 pb-2">
          <button
            type="button"
            onClick={onTitleClick}
            aria-label="タイトル画面に戻る"
            className="inline-flex items-center gap-1 h-8 px-3
              bg-sky-50 hover:bg-sky-100 border border-sky-200 hover:border-sky-300
              text-sky-700 text-xs font-semibold rounded-full
              active:scale-[0.96] transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            トップ
          </button>
        </div>

        {/* 下段: アプリ名 + 設定 / ナビボタン */}
        <div className="flex items-center justify-between">
          {/* アプリ名 + 設定ギア */}
          <div className="flex items-center gap-1.5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">筋トレ記録</h1>
              <p className="text-slate-500 text-sm mt-0.5">部位を選んで記録開始</p>
            </div>
            <button
              type="button"
              onClick={onSettingsClick}
              aria-label="設定を開く"
              className="p-1.5 text-slate-400 hover:text-sky-600 rounded-xl
                active:scale-90 transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M11 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.7 13.7a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 0 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V19a1.8 1.8 0 0 1-3.6 0v-.06A1.5 1.5 0 0 0 8.35 17.7a1.5 1.5 0 0 0-1.65.3l-.05.05a1.8 1.8 0 0 1-2.55-2.55l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H3a1.8 1.8 0 0 1 0-3.6h.06A1.5 1.5 0 0 0 4.3 8.35a1.5 1.5 0 0 0-.3-1.65l-.05-.05a1.8 1.8 0 0 1 2.55-2.55l.05.05a1.5 1.5 0 0 0 1.65.3h.07A1.5 1.5 0 0 0 9.17 3V3a1.8 1.8 0 0 1 3.6 0v.06a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 0 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.38.9H19a1.8 1.8 0 0 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.9h.14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* ナビボタン */}
          <div className="flex items-center gap-1.5">
            <NavButton
              icon="📅"
              label="活動"
              onClick={onHeatmapClick}
              aria-label="活動カレンダーを開く"
            />
            <NavButton
              icon="📈"
              label="統計"
              onClick={onDashboardClick}
              aria-label="統計・ダッシュボードを開く"
            />
            <NavButton
              icon="📋"
              label="履歴"
              onClick={onHistoryClick}
              count={totalSessions}
              aria-label={`ワークアウト履歴（${totalSessions}件）`}
            />
          </div>
        </div>
      </div>

      {/* お任せコース バナー */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={onQuickClick}
          className="w-full bg-sky-500 text-white rounded-2xl px-4 py-3.5 flex items-center gap-3
            shadow-md shadow-sky-500/20 active:scale-[0.98] transition-all
            hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50"
          aria-label="お任せコース: 自動でプランを作成してトレーニング"
        >
          <span className="text-2xl" aria-hidden="true">⚡</span>
          <div className="text-left">
            <p className="text-sm font-bold leading-tight">お任せコース</p>
            <p className="text-xs text-sky-100 mt-0.5">時間とフォーカスを選ぶだけ</p>
          </div>
          <svg className="ml-auto text-sky-200" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 13.5L10.5 9L6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 部位グリッド */}
      <div className="flex-1 px-4 pt-4 pb-safe pb-6">
        <div className="grid grid-cols-2 gap-3">
          {BODY_PARTS.map(bp => {
            const count = EXERCISES.filter(e => e.bodyPart === bp.id).length
            return (
              <button
                key={bp.id}
                type="button"
                onClick={() => onSelect(bp.id)}
                className={`border rounded-2xl p-4 flex flex-col items-start gap-2.5
                  bg-white shadow-sm
                  transition-all duration-100 active:scale-[0.96]
                  hover:shadow-md
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50
                  ${bp.color}`}
              >
                <span className="text-2xl leading-none" role="img" aria-hidden="true">
                  {bp.emoji}
                </span>
                <div className="flex-1 w-full">
                  <p className="text-base font-bold leading-tight text-slate-900">{bp.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{bp.description}</p>
                </div>
                <p className="text-xs font-medium text-slate-400 tabular-nums">{count} 種目</p>
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}

function NavButton({
  icon, label, onClick, count, 'aria-label': ariaLabel,
}: {
  icon: string; label: string; onClick: () => void
  count?: number; 'aria-label'?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-0.5
        bg-sky-50 hover:bg-sky-100 border border-sky-200 hover:border-sky-300
        active:bg-sky-100 active:scale-[0.97]
        rounded-xl w-14 py-2 text-sky-700
        transition-all duration-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      <span className="text-base" aria-hidden="true">{icon}</span>
      <span className="text-[10px] font-semibold">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-sky-500 font-bold tabular-nums leading-none">{count}</span>
      )}
    </button>
  )
}
