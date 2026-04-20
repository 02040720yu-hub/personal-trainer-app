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
 *  title    : ランディング（初回のみ表示。プロフィール設定済みなら main 直入り）
 *  main     : アプリ本体（部位選択・種目・セッション・履歴・統計・ヒートマップ）
 *  settings : 設定画面
 */
type AppLayer = 'title' | 'main' | 'settings'

/**
 * メイン画面内の遷移スタック
 * profile は初回オンボーディング専用（main 内では出現しない）
 */
type MainScreen =
  | 'home'
  | 'exercises'
  | 'session'
  | 'history'
  | 'dashboard'
  | 'quick'
  | 'heatmap'

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // プロフィール設定済みなら main 直入り（UX: トレ開始までの手数を最小化）
  const [layer, setLayer] = useState<AppLayer>(() =>
    getProfile() ? 'main' : 'title'
  )
  // プロフィール設定済みなら起動時は直接お任せ画面へ（主導線）
  const [mainScreen, setMainScreen] = useState<MainScreen>(() =>
    getProfile() ? 'quick' : 'home'
  )
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const goHome = () => {
    setSelectedBodyPart(null)
    setSelectedExercise(null)
    setMainScreen('home')
  }

  const openSettings = () => setLayer('settings')
  const closeSettings = () => setLayer('main')

  const handleDataCleared = () => {
    // データ全削除後はタイトルへ
    goHome()
    setLayer('title')
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        {/* ── タイトル ─────────────────────────────────────────── */}
        {layer === 'title' && (
          <TitleScreen
            onEnterMain={() => setLayer('main')}
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
            {mainScreen === 'home' && (
              <BodyPartSelector
                onSelect={bodyPart => {
                  setSelectedBodyPart(bodyPart)
                  setMainScreen('exercises')
                }}
                onHistoryClick={() => setMainScreen('history')}
                onDashboardClick={() => setMainScreen('dashboard')}
                onQuickClick={() => setMainScreen('quick')}
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
                onHome={goHome}
              />
            )}

            {mainScreen === 'history' && (
              <WorkoutHistory onBack={() => setMainScreen('home')} />
            )}

            {mainScreen === 'dashboard' && (
              <Dashboard onBack={() => setMainScreen('home')} />
            )}

            {mainScreen === 'quick' && (
              <QuickWorkout onBack={() => setMainScreen('home')} />
            )}

            {mainScreen === 'heatmap' && (
              <ActivityHeatmap onBack={() => setMainScreen('home')} />
            )}
          </>
        )}

      </div>
    </div>
  )
}
