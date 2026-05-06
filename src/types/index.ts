export type BodyPart =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'

export interface Exercise {
  id: string
  name: string
  bodyPart: BodyPart
  /** compound: 複合関節種目 / isolation: 単関節種目 */
  category: 'compound' | 'isolation'
  equipment: string

  // ─── Phase 1 追加: コース適合度・難易度・解説情報 ─────────────────────────
  /** 難易度: 初心者は beginner のみ提示する想定 */
  difficulty: 'beginner' | 'intermediate' | 'advanced'

  /** どのコースに適しているか。両方 true の種目もあり得る */
  suitableFor: {
    hypertrophy: boolean
    toning: boolean
  }

  /** 種目の簡単な説明 (30〜80字程度) */
  description: string

  /** セットアップやフォームのコツ (任意、各項目40字以内) */
  setupTips?: string[]

  /** よくある間違い (任意、各項目40字以内) */
  commonMistakes?: string[]

  /** デモ動画URL (任意、YouTube embed URL を想定) */
  videoUrl?: string

  /** 注意フラグ: 怪我リスクが高い種目に true */
  cautionFlag?: boolean

  /** 注意内容の説明 (cautionFlag が true のとき必須想定) */
  cautionNote?: string
  // ────────────────────────────────────────────────────────────────────

  /** 自重種目のフラグ */
  isBodyweight?: boolean
  /** 自重トグルを表示する種目（懸垂・ディップスのみ） */
  supportsBodyweightToggle?: boolean
  /** UI から非表示にする種目（将来実装予定の種目用フラグ） */
  hidden?: boolean
}

export interface UserProfile {
  height: number  // cm
  weight: number  // kg
  gender: 'male' | 'female'

  /** デフォルトコース。性別から自動推定するが手動変更可能 */
  defaultCourse: 'hypertrophy' | 'toning'

  /** 経験レベル */
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'

  /** 標準のトレーニング時間 (分) */
  defaultMinutes: 20 | 30 | 45 | 60 | 90
}

export interface WorkoutSet {
  weight: number  // kg（自重の場合はプロフィール体重を格納）
  reps: number
  isBodyweight?: boolean
}

export interface WorkoutRecord {
  id: string
  exerciseId: string
  date: string          // ISO 8601
  sets: WorkoutSet[]
  best1RM: number       // Epley 式で算出した最大推定 1RM (kg)
  nextTargetWeight: number  // 次回の目標重量（10RM 相当, kg）
  /** お任せコース: 'quick' / 手動: 'manual' / 旧データ: undefined（後方互換） */
  source?: 'quick' | 'manual'
  courseType?: 'hypertrophy' | 'toning'
}
