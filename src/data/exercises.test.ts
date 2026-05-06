import { describe, it, expect } from 'vitest'
import { EXERCISES, getExercisesByBodyPart, getExerciseById } from './exercises'
import { buildQuickWorkoutPlan } from '../lib/quickWorkout'
import type { UserProfile, WorkoutRecord } from '../types'

const PROFILE: UserProfile = {
  height: 170, weight: 70, gender: 'male',
  defaultCourse: 'hypertrophy', experienceLevel: 'beginner', defaultMinutes: 45,
}

describe('懸垂(pull-up)の非表示対応', () => {
  describe('EXERCISES 公開リスト', () => {
    it('pull-up は EXERCISES に含まれない', () => {
      expect(EXERCISES.find(e => e.id === 'pull-up')).toBeUndefined()
    })

    it('hidden=true の種目は EXERCISES から全て除外されている', () => {
      expect(EXERCISES.every(e => !e.hidden)).toBe(true)
    })

    it('懸垂以外の背中種目はそのまま表示される', () => {
      const backIds = EXERCISES.filter(e => e.bodyPart === 'back').map(e => e.id)
      expect(backIds).toContain('deadlift')
      expect(backIds).toContain('lat-pulldown')
      expect(backIds).toContain('barbell-row')
      expect(backIds).not.toContain('pull-up')
    })
  })

  describe('getExercisesByBodyPart', () => {
    it("'back' を指定しても pull-up は返らない", () => {
      const list = getExercisesByBodyPart('back')
      expect(list.find(e => e.id === 'pull-up')).toBeUndefined()
    })

    it("'back' のリスト件数は懸垂を除いた件数", () => {
      const list = getExercisesByBodyPart('back')
      // deadlift, lat-pulldown, barbell-row, seated-row, one-arm-row, face-pull,
      // assisted-pull-up, chest-supported-row, machine-pullover = 9
      expect(list).toHaveLength(9)
    })
  })

  describe('getExerciseById（過去レコードの名前解決）', () => {
    it('hidden な種目でも ID 検索すれば解決できる（過去レコード対応）', () => {
      const ex = getExerciseById('pull-up')
      expect(ex).toBeDefined()
      expect(ex?.name).toBe('懸垂（チンアップ）')
      expect(ex?.hidden).toBe(true)
    })

    it('表示種目も従来通り解決できる', () => {
      expect(getExerciseById('bench-press')?.name).toBe('ベンチプレス')
      expect(getExerciseById('deadlift')?.name).toBe('デッドリフト')
    })

    it('存在しない ID は undefined', () => {
      expect(getExerciseById('non-existent-id')).toBeUndefined()
    })
  })

  describe('QuickWorkout プラン生成', () => {
    it('全身フォーカス: 生成されたプランに懸垂は出てこない', () => {
      // seed を変えて複数試行。決定論的なので 0..49 で十分網羅される
      for (let seed = 0; seed < 50; seed++) {
        const plan = buildQuickWorkoutPlan({
          minutes: 90, focus: 'full',
          profile: PROFILE, records: [], exercises: EXERCISES, seed,
        })
        const hasPullUp = plan.exercises.some(p => p.exercise.id === 'pull-up')
        expect(hasPullUp, `seed=${seed} で懸垂が混入`).toBe(false)
      }
    })

    it('上半身フォーカス: 懸垂は出てこない', () => {
      for (let seed = 0; seed < 50; seed++) {
        const plan = buildQuickWorkoutPlan({
          minutes: 90, focus: 'upper',
          profile: PROFILE, records: [], exercises: EXERCISES, seed,
        })
        const hasPullUp = plan.exercises.some(p => p.exercise.id === 'pull-up')
        expect(hasPullUp, `seed=${seed} で懸垂が混入`).toBe(false)
      }
    })

    it('カスタム[背中のみ]: 懸垂は出てこない（背中種目は他で埋まる）', () => {
      for (let seed = 0; seed < 50; seed++) {
        const plan = buildQuickWorkoutPlan({
          minutes: 90, focus: 'custom', customBodyParts: ['back'],
          profile: PROFILE, records: [], exercises: EXERCISES, seed,
        })
        const hasPullUp = plan.exercises.some(p => p.exercise.id === 'pull-up')
        expect(hasPullUp, `seed=${seed} で懸垂が混入`).toBe(false)
        plan.exercises.forEach(p => {
          expect(p.exercise.bodyPart).toBe('back')
        })
      }
    })

    it('過去に懸垂で記録があってもプランに復活しない', () => {
      const records: WorkoutRecord[] = [{
        id: 'pull-up-historic',
        exerciseId: 'pull-up',
        date: '2024-01-01T00:00:00.000Z',
        sets: [{ weight: 70, reps: 10, isBodyweight: true }],
        best1RM: 95,
        nextTargetWeight: 75,
        source: 'manual',
      }]
      for (let seed = 0; seed < 20; seed++) {
        const plan = buildQuickWorkoutPlan({
          minutes: 90, focus: 'full',
          profile: PROFILE, records, exercises: EXERCISES, seed,
        })
        expect(plan.exercises.some(p => p.exercise.id === 'pull-up')).toBe(false)
      }
      // ただし過去レコードの名前解決は依然として可能
      expect(getExerciseById('pull-up')?.name).toBe('懸垂（チンアップ）')
    })
  })

  describe('BodyPartSelector の件数表示（背中の数）', () => {
    it('back の件数は懸垂を除外した値', () => {
      const backCount = EXERCISES.filter(e => e.bodyPart === 'back').length
      expect(backCount).toBe(9)
    })
  })
})
