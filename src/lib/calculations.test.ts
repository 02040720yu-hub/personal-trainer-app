import { describe, it, expect } from 'vitest'
import {
  calculate1RM,
  calculateWeightForReps,
  calculate10RMTarget,
  getBest1RM,
  roundToNearestPlate,
  calculateInitial1RM,
  calculateInitialTargetWeight,
} from './calculations'

// ─────────────────────────────────────────────────────────────────────────────
describe('calculate1RM (Epley 式)', () => {
  it('reps=1 のとき重量をそのまま返す', () => {
    expect(calculate1RM(100, 1)).toBe(100)
  })

  it('10 回で正しく算出する（100 × 1.333 ≈ 133.3）', () => {
    // 100 × (1 + 10/30) = 133.333...
    expect(calculate1RM(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('5 回で正しく算出する（100 × 1.1666 ≈ 116.7）', () => {
    // 100 × (1 + 5/30) = 116.666...
    expect(calculate1RM(100, 5)).toBeCloseTo(116.67, 1)
  })

  it('weight=0 のとき 0 を返す', () => {
    expect(calculate1RM(0, 10)).toBe(0)
  })

  it('reps=0 のとき 0 を返す', () => {
    expect(calculate1RM(100, 0)).toBe(0)
  })

  it('負の weight のとき 0 を返す', () => {
    expect(calculate1RM(-50, 5)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateWeightForReps (Epley 逆関数)', () => {
  it('targetReps=1 のとき 1RM をそのまま返す', () => {
    expect(calculateWeightForReps(100, 1)).toBe(100)
  })

  it('10RM は 1RM の 75% になる', () => {
    // 100 / (1 + 10/30) = 100 / 1.333... = 75
    expect(calculateWeightForReps(100, 10)).toBeCloseTo(75, 1)
  })

  it('calculate1RM の逆関数として機能する', () => {
    const weight = 80
    const reps = 8
    const oneRM = calculate1RM(weight, reps)
    const recovered = calculateWeightForReps(oneRM, reps)
    expect(recovered).toBeCloseTo(weight, 5)
  })

  it('oneRM=0 のとき 0 を返す', () => {
    expect(calculateWeightForReps(0, 10)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculate10RMTarget', () => {
  it('1RM の 75% を返す', () => {
    expect(calculate10RMTarget(100)).toBeCloseTo(75, 1)
  })

  it('0 のとき 0 を返す', () => {
    expect(calculate10RMTarget(0)).toBe(0)
  })

  it('calculateWeightForReps(1RM, 10) と一致する', () => {
    const oneRM = 120
    expect(calculate10RMTarget(oneRM)).toBeCloseTo(calculateWeightForReps(oneRM, 10), 10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('getBest1RM', () => {
  it('複数セットの中で最大の 1RM を返す', () => {
    const sets = [
      { weight: 60, reps: 10 }, // 1RM ≈ 80
      { weight: 70, reps: 5 },  // 1RM ≈ 81.67
      { weight: 75, reps: 3 },  // 1RM ≈ 82.5  ← 最大
    ]
    expect(getBest1RM(sets)).toBeCloseTo(82.5, 0)
  })

  it('空配列のとき 0 を返す', () => {
    expect(getBest1RM([])).toBe(0)
  })

  it('1 セットのみでも機能する', () => {
    expect(getBest1RM([{ weight: 100, reps: 1 }])).toBe(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('roundToNearestPlate (2.5 kg 単位)', () => {
  it('47.3 → 47.5 に丸まる', () => {
    expect(roundToNearestPlate(47.3)).toBe(47.5)
  })
  it('47.6 → 47.5 に丸まる', () => {
    expect(roundToNearestPlate(47.6)).toBe(47.5)
  })
  it('48.8 → 50 に丸まる', () => {
    expect(roundToNearestPlate(48.8)).toBe(50)
  })
  it('46.2 → 45 に丸まる', () => {
    expect(roundToNearestPlate(46.2)).toBe(45)
  })
  it('ぴったりの倍数はそのまま', () => {
    expect(roundToNearestPlate(100)).toBe(100)
    expect(roundToNearestPlate(42.5)).toBe(42.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateInitial1RM', () => {
  it('スクワット・男性: 体重×0.75', () => {
    expect(calculateInitial1RM('squat', 80, 'male', 'compound')).toBeCloseTo(60, 0)
  })

  it('スクワット・女性: 体重×0.50', () => {
    expect(calculateInitial1RM('squat', 60, 'female', 'compound')).toBeCloseTo(30, 0)
  })

  it('ベンチプレス・男性: 体重×0.50', () => {
    expect(calculateInitial1RM('bench-press', 80, 'male', 'compound')).toBeCloseTo(40, 0)
  })

  it('定義外の種目はデフォルト compound マルチプライヤーを使う（男性: 0.50）', () => {
    expect(calculateInitial1RM('unknown-exercise', 80, 'male', 'compound')).toBeCloseTo(40, 0)
  })

  it('定義外の種目はデフォルト isolation マルチプライヤーを使う（男性: 0.25）', () => {
    expect(calculateInitial1RM('unknown-exercise', 80, 'male', 'isolation')).toBeCloseTo(20, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('calculateInitialTargetWeight', () => {
  it('正の値を返す', () => {
    const result = calculateInitialTargetWeight('bench-press', 70, 'male', 'compound')
    expect(result).toBeGreaterThan(0)
  })

  it('2.5 kg 単位に丸まっている', () => {
    const result = calculateInitialTargetWeight('squat', 80, 'male', 'compound')
    expect(result % 2.5).toBe(0)
  })

  it('初回目標は推定 1RM より小さい（10RM 相当）', () => {
    const bw = 80
    const initial1RM = calculateInitial1RM('squat', bw, 'male', 'compound')
    const target = calculateInitialTargetWeight('squat', bw, 'male', 'compound')
    expect(target).toBeLessThan(initial1RM)
  })

  it('最小値は 2.5 kg', () => {
    // 体重が非常に小さい場合でも最小 2.5 kg
    const result = calculateInitialTargetWeight('lateral-raise', 20, 'female', 'isolation')
    expect(result).toBeGreaterThanOrEqual(2.5)
  })
})
