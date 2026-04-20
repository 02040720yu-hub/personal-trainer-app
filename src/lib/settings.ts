/**
 * settings.ts
 * アプリ設定の LocalStorage 保存・読み込み
 * キー: wt_settings_v1
 */

export type WeekStart = 'monday' | 'sunday'

export interface AppSettings {
  /**
   * 週の始まり曜日。
   * 現バージョンでは週次集計のラベル表示に利用予定（v4 以降の分析画面で対応する）。
   * デフォルト: 'monday'（ISO 8601 準拠）。
   */
  weekStart: WeekStart
}

const SETTINGS_KEY = 'wt_settings_v1'

const DEFAULTS: AppSettings = { weekStart: 'monday' }

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
