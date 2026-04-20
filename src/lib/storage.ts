import type { UserProfile, WorkoutRecord } from '../types'

const KEYS = {
  PROFILE:   'wt_profile_v1',
  RECORDS:   'wt_records_v1',
  GOALS:     'wt_goals_v1',
  SETTINGS:  'wt_settings_v1',
} as const

// ── Profile ──────────────────────────────────────────────────────────────────

export function getProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile))
}

// ── Records ──────────────────────────────────────────────────────────────────

export function getAllRecords(): WorkoutRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.RECORDS)
    return raw ? (JSON.parse(raw) as WorkoutRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecord(record: WorkoutRecord): void {
  const records = getAllRecords()
  records.push(record)
  localStorage.setItem(KEYS.RECORDS, JSON.stringify(records))
}

export function deleteRecord(id: string): void {
  const records = getAllRecords().filter(r => r.id !== id)
  localStorage.setItem(KEYS.RECORDS, JSON.stringify(records))
}

/** プロフィール・記録・設定・目標をすべて削除する */
export function clearAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}

/** 指定種目のレコードを新しい順で返す */
export function getRecordsForExercise(exerciseId: string): WorkoutRecord[] {
  return getAllRecords()
    .filter(r => r.exerciseId === exerciseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/** 指定種目の最新レコードを返す（なければ null） */
export function getLastRecordForExercise(exerciseId: string): WorkoutRecord | null {
  const records = getRecordsForExercise(exerciseId)
  return records.length > 0 ? records[0] : null
}
