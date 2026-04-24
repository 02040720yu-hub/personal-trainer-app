import type { BodyPart, Exercise } from '../types'

export const BODY_PARTS: Array<{
  id: BodyPart
  label: string
  emoji: string
  description: string
  color: string
}> = [
  { id: 'chest',     label: '胸',         emoji: '🏋️', description: '大胸筋',                 color: 'border-sky-300 bg-sky-50'       },
  { id: 'back',      label: '背中',       emoji: '💪', description: '広背筋・脊柱起立筋',     color: 'border-blue-300 bg-blue-50'     },
  { id: 'legs',      label: '脚',         emoji: '🦵', description: '大腿四頭筋・ハムスト',   color: 'border-emerald-300 bg-emerald-50'},
  { id: 'shoulders', label: '肩',         emoji: '🎯', description: '三角筋',                 color: 'border-violet-300 bg-violet-50' },
  { id: 'biceps',    label: '上腕二頭筋', emoji: '🦾', description: '力こぶ',                 color: 'border-rose-300 bg-rose-50'     },
  { id: 'triceps',   label: '上腕三頭筋', emoji: '✊', description: '二の腕',                 color: 'border-amber-300 bg-amber-50'   },
  { id: 'core',      label: 'コア・腹筋', emoji: '🔥', description: '腹直筋・体幹',           color: 'border-orange-300 bg-orange-50' },
]

export const EXERCISES: Exercise[] = [
  // ── 胸 (Chest) ──────────────────────────────────────────────────────────────
  { id: 'bench-press',         name: 'ベンチプレス',             bodyPart: 'chest',     category: 'compound',  equipment: 'バーベル' },
  { id: 'incline-bench-press', name: 'インクラインベンチプレス', bodyPart: 'chest',     category: 'compound',  equipment: 'バーベル' },
  { id: 'decline-bench-press', name: 'デクラインベンチプレス',   bodyPart: 'chest',     category: 'compound',  equipment: 'バーベル' },
  { id: 'dumbbell-fly',        name: 'ダンベルフライ',           bodyPart: 'chest',     category: 'isolation', equipment: 'ダンベル' },
  { id: 'cable-crossover',     name: 'ケーブルクロスオーバー',   bodyPart: 'chest',     category: 'isolation', equipment: 'ケーブル' },
  { id: 'dips-chest',          name: 'ディップス（胸）',         bodyPart: 'chest',     category: 'compound',  equipment: '自重', isBodyweight: true, supportsBodyweightToggle: true },
  { id: 'push-up',             name: 'プッシュアップ',           bodyPart: 'chest',     category: 'compound',  equipment: '自重', isBodyweight: true },

  // ── 背中 (Back) ─────────────────────────────────────────────────────────────
  { id: 'deadlift',            name: 'デッドリフト',             bodyPart: 'back',      category: 'compound',  equipment: 'バーベル' },
  { id: 'pull-up',             name: '懸垂（チンアップ）',       bodyPart: 'back',      category: 'compound',  equipment: '自重', isBodyweight: true, supportsBodyweightToggle: true },
  { id: 'lat-pulldown',        name: 'ラットプルダウン',         bodyPart: 'back',      category: 'compound',  equipment: 'マシン' },
  { id: 'barbell-row',         name: 'バーベルロウ',             bodyPart: 'back',      category: 'compound',  equipment: 'バーベル' },
  { id: 'seated-row',          name: 'シーテッドロウ',           bodyPart: 'back',      category: 'compound',  equipment: 'マシン' },
  { id: 'one-arm-row',         name: 'ワンアームダンベルロウ',   bodyPart: 'back',      category: 'compound',  equipment: 'ダンベル' },
  { id: 'face-pull',           name: 'フェイスプル',             bodyPart: 'back',      category: 'isolation', equipment: 'ケーブル' },

  // ── 脚 (Legs) ────────────────────────────────────────────────────────────────
  { id: 'squat',               name: 'バーベルスクワット',       bodyPart: 'legs',      category: 'compound',  equipment: 'バーベル' },
  { id: 'leg-press',           name: 'レッグプレス',             bodyPart: 'legs',      category: 'compound',  equipment: 'マシン' },
  { id: 'romanian-deadlift',   name: 'ルーマニアンデッドリフト', bodyPart: 'legs',      category: 'compound',  equipment: 'バーベル' },
  { id: 'lunge',               name: 'ランジ',                   bodyPart: 'legs',      category: 'compound',  equipment: '自重/ダンベル' },
  { id: 'leg-curl',            name: 'レッグカール',             bodyPart: 'legs',      category: 'isolation', equipment: 'マシン' },
  { id: 'leg-extension',       name: 'レッグエクステンション',   bodyPart: 'legs',      category: 'isolation', equipment: 'マシン' },
  { id: 'calf-raise',          name: 'カーフレイズ',             bodyPart: 'legs',      category: 'isolation', equipment: 'マシン/自重' },

  // ── 肩 (Shoulders) ───────────────────────────────────────────────────────────
  { id: 'overhead-press',          name: 'ショルダープレス（BB）',     bodyPart: 'shoulders', category: 'compound',  equipment: 'バーベル' },
  { id: 'dumbbell-shoulder-press', name: 'ダンベルショルダープレス',   bodyPart: 'shoulders', category: 'compound',  equipment: 'ダンベル' },
  { id: 'lateral-raise',           name: 'サイドレイズ',               bodyPart: 'shoulders', category: 'isolation', equipment: 'ダンベル' },
  { id: 'front-raise',             name: 'フロントレイズ',             bodyPart: 'shoulders', category: 'isolation', equipment: 'ダンベル' },
  { id: 'upright-row',             name: 'アップライトロウ',           bodyPart: 'shoulders', category: 'compound',  equipment: 'バーベル' },

  // ── 上腕二頭筋 (Biceps) ──────────────────────────────────────────────────────
  { id: 'barbell-curl',       name: 'バーベルカール',             bodyPart: 'biceps',    category: 'isolation', equipment: 'バーベル' },
  { id: 'dumbbell-curl',      name: 'ダンベルカール',             bodyPart: 'biceps',    category: 'isolation', equipment: 'ダンベル' },
  { id: 'hammer-curl',        name: 'ハンマーカール',             bodyPart: 'biceps',    category: 'isolation', equipment: 'ダンベル' },
  { id: 'concentration-curl', name: 'コンセントレーションカール', bodyPart: 'biceps',    category: 'isolation', equipment: 'ダンベル' },
  { id: 'preacher-curl',      name: 'プリーチャーカール',         bodyPart: 'biceps',    category: 'isolation', equipment: 'バーベル' },

  // ── 上腕三頭筋 (Triceps) ─────────────────────────────────────────────────────
  { id: 'triceps-pushdown',  name: 'トライセプスプッシュダウン', bodyPart: 'triceps',   category: 'isolation', equipment: 'ケーブル' },
  { id: 'skull-crusher',     name: 'スカルクラッシャー',         bodyPart: 'triceps',   category: 'isolation', equipment: 'バーベル' },
  { id: 'overhead-triceps',  name: 'オーバーヘッドトライセプス', bodyPart: 'triceps',   category: 'isolation', equipment: 'ダンベル' },
  { id: 'dips-triceps',      name: 'ディップス（三頭筋）',       bodyPart: 'triceps',   category: 'compound',  equipment: '自重', isBodyweight: true, supportsBodyweightToggle: true },
  { id: 'close-grip-bench',  name: 'ナローグリップベンチ',       bodyPart: 'triceps',   category: 'compound',  equipment: 'バーベル' },

  // ── コア・腹筋 (Core) ────────────────────────────────────────────────────────
  { id: 'plank',         name: 'プランク',         bodyPart: 'core', category: 'isolation', equipment: '自重', isBodyweight: true },
  { id: 'crunch',        name: 'クランチ',         bodyPart: 'core', category: 'isolation', equipment: '自重', isBodyweight: true },
  { id: 'leg-raise',     name: 'レッグレイズ',     bodyPart: 'core', category: 'isolation', equipment: '自重', isBodyweight: true },
  { id: 'russian-twist', name: 'ロシアンツイスト', bodyPart: 'core', category: 'isolation', equipment: '自重/重り' },
  { id: 'ab-wheel',      name: 'アブローラー',     bodyPart: 'core', category: 'isolation', equipment: 'アブローラー', isBodyweight: true },
  { id: 'cable-crunch',  name: 'ケーブルクランチ', bodyPart: 'core', category: 'isolation', equipment: 'ケーブル' },
]

export function getExercisesByBodyPart(bodyPart: BodyPart): Exercise[] {
  return EXERCISES.filter(e => e.bodyPart === bodyPart)
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id)
}
