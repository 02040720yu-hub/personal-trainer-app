import { useState } from 'react'
import type { BodyPart, Exercise } from './types'
import { getProfile } from './lib/storage'

// 画面コンポーネント
import TitleScreen    from './components/TitleScreen'
import SettingsScreen from './components/SettingsScreen'
import BodyPartSelector  from './components/BodyPartSelector'
import ExerciseSelector  from './components/ExerciseSelector'
import WorkoutSession    from './components/WorkoutSession'
import WorkoutHistory    from './components/WorkoutHistory'
import Dashboard         from './components/Dashboard'
import QuickWorkout      from './components/QuickWorkout'
import ActivityHeatmap   from './components/ActivityHeatmap'

// ─────────────────────────────────────────────────────────────────────────────
// 画面レイヤー
// ─────────────────────────────────────────────────────────────────────────────

/**
 * アプリ最上位レイヤー
 *  title    : ランディング（初回のみ。プロフィール設定済みなら main 直入り）
 *  main     : アプリ本体
 *  settings : 設定画面
 */
type AppLayer = 'title' | 'main' | 'settings'

/**
 * メイン画面内の遷移スタック
 *
 * 主導線: quick（お任せハブ） → dashboard / heatmap / history
 * 予備導線（将来用・通常 UI からは非到達）: home / exercises / session
 */
type MainScreen =
  | 'quick'
  | 'dashboard'
  | 'heatmap'
  | 'history'
  | 'home'      // 将来用: 手動種目選択の入口（通常導線から除外）
  | 'exercises' // 将来用
  | 'session'   // 将来用

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // プロフィール設定済みなら main 直入り
  const [layer, setLayer] = useState<AppLayer>(() =>
    getProfile() ? 'main' : 'title'
  )
  // 常に quick（お任せハブ）を起点とする
  const [mainScreen, setMainScreen] = useState<MainScreen>('quick')

  // 将来用: 手動種目選択フローのための状態（通常導線では使用しない）
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  /** quick に戻る（全画面の「戻る」先） */
  const goQuick = () => setMainScreen('quick')

  const openSettings = () => setLayer('settings')
  const closeSettings = () => setLayer('main')

  const handleDataCleared = () => {
    goQuick()
    setLayer('title')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        {/* ── タイトル ─────────────────────────────────────────── */}
        {layer === 'title' && (
          <TitleScreen
            onEnterMain={() => {
              setMainScreen('quick')
              setLayer('main')
            }}
            onOpenSettings={openSettings}
          />
        )}

        {/* ── 設定 ─────────────────────────────────────────────── */}
        {layer === 'settings' && (
          <SettingsScreen
            onBack={closeSettings}
            onDataCleared={handleDataCleared}
          />
        )}

        {/* ── メイン ───────────────────────────────────────────── */}
        {layer === 'main' && (
          <>
            {/* ── 主導線 ── */}
            {mainScreen === 'quick' && (
              <QuickWorkout
                onOpenDashboard={() => setMainScreen('dashboard')}
                onOpenHeatmap={() => setMainScreen('heatmap')}
                onOpenSettings={openSettings}
                onOpenTitle={() => setLayer('title')}
              />
            )}

            {mainScreen === 'dashboard' && (
              <Dashboard onBack={goQuick} />
            )}

            {mainScreen === 'heatmap' && (
              <ActivityHeatmap onBack={goQuick} />
            )}

            {mainScreen === 'history' && (
              <WorkoutHistory onBack={goQuick} />
            )}

            {/* ── 将来用: 手動種目選択（通常導線から非到達） ── */}
            {mainScreen === 'home' && (
              <BodyPartSelector
                onSelect={bodyPart => {
                  setSelectedBodyPart(bodyPart)
                  setMainScreen('exercises')
                }}
                onHistoryClick={() => setMainScreen('history')}
                onDashboardClick={() => setMainScreen('dashboard')}
                onQuickClick={goQuick}
                onHeatmapClick={() => setMainScreen('heatmap')}
                onSettingsClick={openSettings}
                onTitleClick={() => setLayer('title')}
              />
            )}

            {mainScreen === 'exercises' && selectedBodyPart && (
              <ExerciseSelector
                bodyPart={selectedBodyPart}
                onSelect={exercise => {
                  setSelectedExercise(exercise)
                  setMainScreen('session')
                }}
                onBack={() => setMainScreen('home')}
              />
            )}

            {mainScreen === 'session' && selectedExercise && (
              <WorkoutSession
                exercise={selectedExercise}
                onBack={() => setMainScreen('exercises')}
                onHome={goQuick}
              />
            )}
          </>
        )}

      </div>
    </div>
  )
}
