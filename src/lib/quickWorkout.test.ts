import { describe, it, expect } from 'vitest'
import type { Exercise, UserProfile, WorkoutRecord } from '../types'
import { calcCapacity, buildQuickWorkoutPlan, getBodyPartsForFocus } from './quickWorkout'

// ── テスト用ヘルパー ──────────────────────────────────────────────────────────

const PROFILE: UserProfile = { height: 170, weight: 70, gender: 'male' }

const EXERCISES: Exercise[] = [
  { id: 'bench-press',    name: 'ベンチプレス',   bodyPart: 'chest',     category: 'compound',  equipment: 'barbell' },
  { id: 'dumbbell-fly',   name: 'ダンベルフライ', bodyPart: 'chest',     category: 'isolation', equipment: 'dumbbell' },
  { id: 'squat',          name: 'スクワット',     bodyPart: 'legs',      category: 'compound',  equipment: 'barbell' },
  { id: 'leg-press',      name: 'レッグプレス',   bodyPart: 'legs',      category: 'compound',  equipment: 'machine' },
  { id: 'leg-curl',       name: 'レッグカール',   bodyPart: 'legs',      category: 'isolation', equipment: 'machine' },
  { id: 'deadlift',       name: 'デッドリフト',   bodyPart: 'back',      category: 'compound',  equipment: 'barbell' },
  { id: 'barbell-row',    name: 'ベントオーバー', bodyPart: 'back',      category: 'compound',  equipment: 'barbell' },
  { id: 'lat-pulldown',   name: 'ラットプルダウン', bodyPart: 'back',    category: 'compound',  equipment: 'cable' },
  { id: 'overhead-press', name: 'ショルダープレス', bodyPart: 'shoulders', category: 'compound', equipment: 'barbell' },
  { id: 'lateral-raise',  name: 'サイドレイズ',   bodyPart: 'shoulders', category: 'isolation', equipment: 'dumbbell' },
  { id: 'barbell-curl',   name: 'バーベルカール', bodyPart: 'biceps',    category: 'compound',  equipment: 'barbell' },
  { id: 'triceps-pushdown', name: 'トライセップス', bodyPart: 'triceps', category: 'isolation', equipment: 'cable' },
  { id: 'cable-crunch',   name: 'ケーブルクランチ', bodyPart: 'core',    category: 'isolation', equipment: 'cable' },
]

function makeRecord(
  exerciseId: string,
  date: string,
  best1RM: number,
  nextTargetWeight: number,
): WorkoutRecord {
  return {
    id: `${exerciseId}-${date}`,
    exerciseId,
    date,
    sets: [{ weight: nextTargetWeight, reps: 10 }],
    best1RM,
    nextTargetWeight,
  }
}

// ── calcCapacity ──────────────────────────────────────────────────────────────

describe('calcCapacity', () => {
  it('20分: ウォームアップ8分引いた12分 → 4セット, 1種目', () => {
    const { totalSets, exerciseCount } = calcCapacity(20)
    expect(totalSets).toBe(4)
    expect(exerciseCount).toBe(1)
  })

  it('30分 → 7セット, 2種目', () => {
    const { totalSets, exerciseCount } = calcCapacity(30)
    expect(totalSets).toBe(7)
    expect(exerciseCount).toBe(2)
  })

  it('45分 → 12セット, 4種目', () => {
    const { totalSets, exerciseCount } = calcCapacity(45)
    expect(totalSets).toBe(12)
    expect(exerciseCount).toBe(4)
  })

  it('60分 → 17セット, 5種目', () => {
    const { totalSets, exerciseCount } = calcCapacity(60)
    expect(totalSets).toBe(17)
    expect(exerciseCount).toBe(5)
  })

  it('90分 → 27セット, 8種目（上限）', () => {
    const { totalSets, exerciseCount } = calcCapacity(90)
    expect(totalSets).toBe(27)
    expect(exerciseCount).toBe(8)
  })

  it('5分（ウォームアップ以下）→ 0セット, 1種目（最小）', () => {
    const { totalSets, exerciseCount } = calcCapacity(5)
    expect(totalSets).toBe(0)
    expect(exerciseCount).toBe(1)
  })
})

// ── buildQuickWorkoutPlan (プリセット) ────────────────────────────────────────

describe('buildQuickWorkoutPlan', () => {
  it('フルボディ30分: exerciseCount 個の種目を返す', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 30, focus: 'full',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 42,
    })
    const { exerciseCount } = calcCapacity(30)
    expect(plan.exercises).toHaveLength(exerciseCount)
  })

  it('上半身フォーカス: legs が含まれない', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 60, focus: 'upper',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 1,
    })
    const hasLegs = plan.exercises.some(p => p.exercise.bodyPart === 'legs')
    expect(hasLegs).toBe(false)
  })

  it('下半身フォーカス: chest/back/shoulders/biceps/triceps が含まれない', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 60, focus: 'lower',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 1,
    })
    const upperParts = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
    const hasUpper = plan.exercises.some(p => upperParts.includes(p.exercise.bodyPart))
    expect(hasUpper).toBe(false)
  })

  it('過去記録なし → weightSource が estimate', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 30, focus: 'full',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 7,
    })
    plan.exercises.forEach(p => {
      expect(p.weightSource).toBe('estimate')
    })
  })

  it('過去記録あり → 対象種目の weightSource が record', () => {
    const records: WorkoutRecord[] = [
      makeRecord('squat', '2024-04-01T10:00:00.000Z', 100, 75),
    ]
    const plan = buildQuickWorkoutPlan({
      minutes: 60, focus: 'lower',
      profile: PROFILE, records, exercises: EXERCISES, seed: 3,
    })
    const squatPlan = plan.exercises.find(p => p.exercise.id === 'squat')
    if (squatPlan) {
      expect(squatPlan.weightSource).toBe('record')
      expect(squatPlan.targetWeight).toBe(75) // nextTargetWeight そのまま
    }
  })

  it('seed が同じなら同じ結果を返す（決定論的）', () => {
    const params = {
      minutes: 45, focus: 'full' as const,
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 999,
    }
    const plan1 = buildQuickWorkoutPlan(params)
    const plan2 = buildQuickWorkoutPlan(params)
    expect(plan1.exercises.map(p => p.exercise.id)).toEqual(
      plan2.exercises.map(p => p.exercise.id)
    )
  })

  it('totalSets が exercises の targetSets 合計と一致する', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 45, focus: 'full',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 5,
    })
    const sumSets = plan.exercises.reduce((acc, p) => acc + p.targetSets, 0)
    expect(sumSets).toBe(plan.totalSets)
  })

  it('targetWeight は常に 2.5 kg 以上', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 30, focus: 'full',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 0,
    })
    plan.exercises.forEach(p => {
      expect(p.targetWeight).toBeGreaterThanOrEqual(2.5)
    })
  })

  it('minutes を plan.minutes で取得できる', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 45, focus: 'upper',
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 1,
    })
    expect(plan.minutes).toBe(45)
    expect(plan.focus).toBe('upper')
  })
})

// ── buildQuickWorkoutPlan (custom bodyParts) ──────────────────────────────────

describe('buildQuickWorkoutPlan - custom bodyParts', () => {
  it('1部位（custom: chest）でプラン生成できる', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 30, focus: 'custom',
      customBodyParts: ['chest'],
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 1,
    })
    expect(plan.exercises.length).toBeGreaterThan(0)
    plan.exercises.forEach(p => {
      expect(p.exercise.bodyPart).toBe('chest')
    })
  })

  it('複数部位（custom: chest + back）でプラン生成できる', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 60, focus: 'custom',
      customBodyParts: ['chest', 'back'],
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 2,
    })
    expect(plan.exercises.length).toBeGreaterThan(0)
    plan.exercises.forEach(p => {
      expect(['chest', 'back']).toContain(p.exercise.bodyPart)
    })
  })

  it('全7部位（custom）でプラン生成できる', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 90, focus: 'custom',
      customBodyParts: ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'],
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 3,
    })
    expect(plan.exercises.length).toBeGreaterThan(0)
  })

  it('0部位（custom）は空の種目配列を返す', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 30, focus: 'custom',
      customBodyParts: [],
      profile: PROFILE, records: [], exercises: EXERCISES,
    })
    expect(plan.exercises).toHaveLength(0)
    expect(plan.totalSets).toBe(0)
  })

  it('custom プランの customBodyParts が plan に保存される', () => {
    const bodyParts = ['chest', 'legs'] as const
    const plan = buildQuickWorkoutPlan({
      minutes: 45, focus: 'custom',
      customBodyParts: [...bodyParts],
      profile: PROFILE, records: [], exercises: EXERCISES, seed: 10,
    })
    expect(plan.customBodyParts).toEqual([...bodyParts])
  })

  it('custom: 過去記録ありで weightSource が record になる', () => {
    const records: WorkoutRecord[] = [
      makeRecord('bench-press', '2024-04-01T10:00:00.000Z', 80, 60),
    ]
    const plan = buildQuickWorkoutPlan({
      minutes: 30, focus: 'custom',
      customBodyParts: ['chest'],
      profile: PROFILE, records, exercises: EXERCISES, seed: 5,
    })
    const benchPlan = plan.exercises.find(p => p.exercise.id === 'bench-press')
    if (benchPlan) {
      expect(benchPlan.weightSource).toBe('record')
      expect(benchPlan.targetWeight).toBe(60)
    }
  })
})

// ── getBodyPartsForFocus ──────────────────────────────────────────────────────

describe('getBodyPartsForFocus', () => {
  it('full → 7部位すべてを含む', () => {
    const parts = getBodyPartsForFocus('full')
    expect(parts).toHaveLength(7)
    expect(parts).toContain('chest')
    expect(parts).toContain('back')
    expect(parts).toContain('legs')
    expect(parts).toContain('shoulders')
    expect(parts).toContain('biceps')
    expect(parts).toContain('triceps')
    expect(parts).toContain('core')
  })

  it('upper → legs が含まれない', () => {
    const parts = getBodyPartsForFocus('upper')
    expect(parts).not.toContain('legs')
    expect(parts).not.toContain('core')
    expect(parts.length).toBeGreaterThan(0)
  })

  it('lower → legs と core のみ', () => {
    const parts = getBodyPartsForFocus('lower')
    expect(parts).toContain('legs')
    expect(parts).toContain('core')
    expect(parts).toHaveLength(2)
  })
})
