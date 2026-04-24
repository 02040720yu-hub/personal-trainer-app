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
  /** 自重種目のフラグ */
  isBodyweight?: boolean
  /** 自重トグルを表示する種目（懸垂・ディップスのみ） */
  supportsBodyweightToggle?: boolean
}

export interface UserProfile {
  height: number  // cm
  weight: number  // kg
  gender: 'male' | 'female'
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
