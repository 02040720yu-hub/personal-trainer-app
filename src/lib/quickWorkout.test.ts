import { describe, it, expect } from 'vitest'
import type { Exercise, UserProfile, WorkoutRecord } from '../types'
import { calcCapacity, buildQuickWorkoutPlan, getBodyPartsForFocus } from './quickWorkout'
import { EXERCISES as PROD_EXERCISES } from '../data/exercises'

// ── テスト用ヘルパー ──────────────────────────────────────────────────────────

const PROFILE: UserProfile = {
  height: 170, weight: 70, gender: 'male',
  defaultCourse: 'hypertrophy', experienceLevel: 'beginner', defaultMinutes: 45,
}

// テスト用に最小限のメタを付けるヘルパー（プラン生成ロジック自体は新フィールドを使わない）
const meta = {
  difficulty: 'beginner' as const,
  suitableFor: { hypertrophy: true, toning: true },
  description: 'test fixture',
}

const EXERCISES: Exercise[] = [
  { id: 'bench-press',    name: 'ベンチプレス',   bodyPart: 'chest',     category: 'compound',  equipment: 'barbell',  ...meta },
  { id: 'dumbbell-fly',   name: 'ダンベルフライ', bodyPart: 'chest',     category: 'isolation', equipment: 'dumbbell', ...meta },
  { id: 'squat',          name: 'スクワット',     bodyPart: 'legs',      category: 'compound',  equipment: 'barbell',  ...meta },
  { id: 'leg-press',      name: 'レッグプレス',   bodyPart: 'legs',      category: 'compound',  equipment: 'machine',  ...meta },
  { id: 'leg-curl',       name: 'レッグカール',   bodyPart: 'legs',      category: 'isolation', equipment: 'machine',  ...meta },
  { id: 'deadlift',       name: 'デッドリフト',   bodyPart: 'back',      category: 'compound',  equipment: 'barbell',  ...meta },
  { id: 'barbell-row',    name: 'ベントオーバー', bodyPart: 'back',      category: 'compound',  equipment: 'barbell',  ...meta },
  { id: 'lat-pulldown',   name: 'ラットプルダウン', bodyPart: 'back',    category: 'compound',  equipment: 'cable',    ...meta },
  { id: 'overhead-press', name: 'ショルダープレス', bodyPart: 'shoulders', category: 'compound', equipment: 'barbell', ...meta },
  { id: 'lateral-raise',  name: 'サイドレイズ',   bodyPart: 'shoulders', category: 'isolation', equipment: 'dumbbell', ...meta },
  { id: 'barbell-curl',   name: 'バーベルカール', bodyPart: 'biceps',    category: 'compound',  equipment: 'barbell',  ...meta },
  { id: 'triceps-pushdown', name: 'トライセップス', bodyPart: 'triceps', category: 'isolation', equipment: 'cable',    ...meta },
  { id: 'cable-crunch',   name: 'ケーブルクランチ', bodyPart: 'core',    category: 'isolation', equipment: 'cable',    ...meta },
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

// ── Phase 3: コース別 / experienceLevel フィルタ + ヒップ優遇 ─────────────────

describe('buildQuickWorkoutPlan - course / experienceLevel フィルタ (Phase 3)', () => {
  // suitableFor / difficulty のバリエーションを意図的に持つテスト用フィクスチャ
  const MIXED: Exercise[] = [
    // chest: 両方OK / hypertrophy専用
    { id: 'machine-chest-press', name: 'マシンチェストプレス', bodyPart: 'chest', category: 'compound', equipment: 'machine',
      difficulty: 'beginner',     suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'bench-press',         name: 'ベンチプレス',       bodyPart: 'chest', category: 'compound', equipment: 'barbell',
      difficulty: 'intermediate', suitableFor: { hypertrophy: true,  toning: false }, description: 'desc' },

    // back: beginner と advanced を混ぜる
    { id: 'lat-pulldown',        name: 'ラットプルダウン',   bodyPart: 'back',  category: 'compound', equipment: 'machine',
      difficulty: 'beginner',     suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'deadlift',            name: 'デッドリフト',       bodyPart: 'back',  category: 'compound', equipment: 'barbell',
      difficulty: 'advanced',     suitableFor: { hypertrophy: true,  toning: false }, description: 'desc' },

    // legs: ヒップ系 / 非ヒップ / hypertrophy専用 を混ぜる
    { id: 'hip-thrust',           name: 'ヒップスラスト',           bodyPart: 'legs', category: 'compound', equipment: 'barbell',
      difficulty: 'beginner',     suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'romanian-deadlift',    name: 'ルーマニアンデッド',       bodyPart: 'legs', category: 'compound', equipment: 'barbell',
      difficulty: 'intermediate', suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'bulgarian-split-squat',name: 'ブルガリアンスクワット',   bodyPart: 'legs', category: 'compound', equipment: 'dumbbell',
      difficulty: 'intermediate', suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'hip-abduction',        name: 'ヒップアブダクション',     bodyPart: 'legs', category: 'isolation', equipment: 'machine',
      difficulty: 'beginner',     suitableFor: { hypertrophy: false, toning: true  }, description: 'desc' },
    { id: 'glute-bridge',         name: 'グルートブリッジ',         bodyPart: 'legs', category: 'isolation', equipment: 'bodyweight',
      difficulty: 'beginner',     suitableFor: { hypertrophy: false, toning: true  }, description: 'desc' },
    { id: 'kickback',             name: 'キックバック',             bodyPart: 'legs', category: 'isolation', equipment: 'cable',
      difficulty: 'beginner',     suitableFor: { hypertrophy: false, toning: true  }, description: 'desc' },
    { id: 'leg-curl',             name: 'レッグカール',             bodyPart: 'legs', category: 'isolation', equipment: 'machine',
      difficulty: 'beginner',     suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'leg-extension',        name: 'レッグエクステンション',   bodyPart: 'legs', category: 'isolation', equipment: 'machine',
      difficulty: 'beginner',     suitableFor: { hypertrophy: true,  toning: true  }, description: 'desc' },
    { id: 'squat',                name: 'バーベルスクワット',       bodyPart: 'legs', category: 'compound', equipment: 'barbell',
      difficulty: 'intermediate', suitableFor: { hypertrophy: true,  toning: false }, description: 'desc' },

    // shoulders / biceps / triceps / core: 埋め用に最低 1 種目ずつ
    { id: 'machine-shoulder-press', name: 'マシンSP',     bodyPart: 'shoulders', category: 'compound', equipment: 'machine',
      difficulty: 'beginner',       suitableFor: { hypertrophy: true, toning: true }, description: 'desc' },
    { id: 'cable-curl',             name: 'ケーブルカール', bodyPart: 'biceps', category: 'isolation', equipment: 'cable',
      difficulty: 'beginner',       suitableFor: { hypertrophy: true, toning: true }, description: 'desc' },
    { id: 'rope-pushdown',          name: 'ロープ',         bodyPart: 'triceps', category: 'isolation', equipment: 'cable',
      difficulty: 'beginner',       suitableFor: { hypertrophy: true, toning: true }, description: 'desc' },
    { id: 'plank',                  name: 'プランク',       bodyPart: 'core',   category: 'isolation', equipment: 'bodyweight',
      difficulty: 'beginner',       suitableFor: { hypertrophy: false, toning: true }, description: 'desc' },
  ]

  it('1) hypertrophy コース: 選出される全種目で suitableFor.hypertrophy === true', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = buildQuickWorkoutPlan({
        minutes: 90, focus: 'full', courseType: 'hypertrophy',
        profile: PROFILE, records: [], exercises: MIXED, seed,
      })
      plan.exercises.forEach(p => {
        expect(p.exercise.suitableFor.hypertrophy, `seed=${seed} で ${p.exercise.id}`).toBe(true)
      })
    }
  })

  it('2) toning コース: 選出される全種目で suitableFor.toning === true', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = buildQuickWorkoutPlan({
        minutes: 90, focus: 'full', courseType: 'toning',
        profile: PROFILE, records: [], exercises: MIXED, seed,
      })
      plan.exercises.forEach(p => {
        expect(p.exercise.suitableFor.toning, `seed=${seed} で ${p.exercise.id}`).toBe(true)
      })
    }
  })

  it('3) toning コース: hypertrophy 専用種目（ベンチプレス等）は選出されない', () => {
    const HYPER_ONLY = ['bench-press', 'deadlift', 'squat']
    for (let seed = 0; seed < 30; seed++) {
      const plan = buildQuickWorkoutPlan({
        minutes: 90, focus: 'full', courseType: 'toning',
        profile: PROFILE, records: [], exercises: MIXED, seed,
      })
      const ids = plan.exercises.map(p => p.exercise.id)
      HYPER_ONLY.forEach(id => {
        expect(ids, `seed=${seed} で ${id} が混入`).not.toContain(id)
      })
    }
  })

  it("4) experienceLevel='beginner' のとき advanced 種目は選出されない", () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = buildQuickWorkoutPlan({
        minutes: 90, focus: 'full', courseType: 'hypertrophy',
        experienceLevel: 'beginner',
        profile: PROFILE, records: [], exercises: MIXED, seed,
      })
      plan.exercises.forEach(p => {
        expect(p.exercise.difficulty, `seed=${seed} で ${p.exercise.id} が advanced`).not.toBe('advanced')
      })
    }
  })

  it('5) toning + legs フォーカス: ヒップ系種目が必ず含まれる', () => {
    const HIP_IDS = ['hip-thrust', 'hip-abduction', 'glute-bridge',
                     'kickback', 'romanian-deadlift', 'bulgarian-split-squat']
    for (let seed = 0; seed < 30; seed++) {
      const plan = buildQuickWorkoutPlan({
        minutes: 60, focus: 'custom', customBodyParts: ['legs'], courseType: 'toning',
        profile: PROFILE, records: [], exercises: MIXED, seed,
      })
      const hasHip = plan.exercises.some(p => HIP_IDS.includes(p.exercise.id))
      expect(hasHip, `seed=${seed} でヒップ系種目が含まれない`).toBe(true)
    }
  })
})

// ── Phase 6: ラウンドロビン部位均等配分 ────────────────────────────────────────

describe('buildQuickWorkoutPlan: 部位均等配分 (Phase 6)', () => {
  // Phase 6 テストは実プロダクト種目で挙動を検証するため、ローカルではなく
  // import した EXERCISES（src/data/exercises.ts）を使う
  const FEMALE_BEGINNER: UserProfile = {
    height: 158, weight: 52, gender: 'female',
    defaultCourse: 'toning', experienceLevel: 'beginner', defaultMinutes: 45,
  }

  it('複数部位プリセットでは各部位から最低1種目選ばれる', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 45,
      focus: 'custom',
      customBodyParts: ['legs', 'back', 'shoulders', 'core'],
      courseType: 'toning',
      experienceLevel: 'beginner',
      profile: FEMALE_BEGINNER,
      records: [],
      exercises: PROD_EXERCISES,
      seed: 42,
    })

    // 4種目枠 = 4部位 → 各部位から1つずつ取れているはず
    const selectedBodyParts = new Set(plan.exercises.map(e => e.exercise.bodyPart))
    expect(selectedBodyParts.size).toBe(4)
    expect(selectedBodyParts.has('legs')).toBe(true)
    expect(selectedBodyParts.has('back')).toBe(true)
    expect(selectedBodyParts.has('shoulders')).toBe(true)
    expect(selectedBodyParts.has('core')).toBe(true)
  })

  it('引き締め+脚部位のとき、ヒップ系種目が先頭に来る', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 30,
      focus: 'custom',
      customBodyParts: ['legs'],
      courseType: 'toning',
      experienceLevel: 'beginner',
      profile: FEMALE_BEGINNER,
      records: [],
      exercises: PROD_EXERCISES,
      seed: 42,
    })

    const firstExerciseId = plan.exercises[0]?.exercise.id
    expect([
      'hip-thrust', 'hip-abduction', 'glute-bridge',
      'kickback', 'romanian-deadlift', 'bulgarian-split-squat',
    ]).toContain(firstExerciseId)
  })

  it('引き締めコース「全身引き締め」プリセットで背中種目が含まれる', () => {
    const plan = buildQuickWorkoutPlan({
      minutes: 45,
      focus: 'custom',
      customBodyParts: ['legs', 'back', 'shoulders', 'core'],
      courseType: 'toning',
      experienceLevel: 'beginner',
      profile: FEMALE_BEGINNER,
      records: [],
      exercises: PROD_EXERCISES,
      seed: 42,
    })

    expect(plan.exercises.some(e => e.exercise.bodyPart === 'back')).toBe(true)
  })

  it('exerciseCount > 部位数 のとき、ラウンドロビンで複数部位が均等に取られる', () => {
    // 90分 → 8種目（calcCapacity 上限）。legs/core 2部位なので、ラウンドロビンで
    // legs だけで埋め尽くさず core も 1 種目以上取られる
    const plan = buildQuickWorkoutPlan({
      minutes: 90,
      focus: 'custom',
      customBodyParts: ['legs', 'core'],
      courseType: 'toning',
      experienceLevel: 'beginner',
      profile: FEMALE_BEGINNER,
      records: [],
      exercises: PROD_EXERCISES,
      seed: 42,
    })

    const legsCount = plan.exercises.filter(e => e.exercise.bodyPart === 'legs').length
    const coreCount = plan.exercises.filter(e => e.exercise.bodyPart === 'core').length
    expect(legsCount).toBeGreaterThanOrEqual(1)
    expect(coreCount).toBeGreaterThanOrEqual(1)
    expect(legsCount + coreCount).toBe(plan.exercises.length)
  })
})
