# 筋トレ記録アプリ

スマートフォン向けの筋トレ記録 PWA です。部位選択・種目提案・1RM 算出・次回目標提示をシンプルな UI で実現します。

## 分析・可視化・エクスポート機能（v4）

### 追加・変更した主要ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/analytics.ts` | 全分析純粋関数（週次集計・ストリーク・PR判定・ヒートマップ等） |
| `src/lib/analytics.test.ts` | analytics.ts の単体テスト 30 件 |
| `src/lib/goals.ts` | 週次目標の LocalStorage 保存・読み込み（キー: `wt_goals_v1`） |
| `src/lib/export.ts` | CSV エクスポート（1行=1セット形式、UTF-8 BOM付き） |
| `src/components/Dashboard.tsx` | 統計ダッシュボード（サマリー / 推移・PR / カレンダー 3タブ） |
| `src/App.tsx` | `'dashboard'` 画面を追加 |
| `src/components/BodyPartSelector.tsx` | 「統計」「履歴」ナビボタンを追加 |
| `src/components/WorkoutSession.tsx` | PR チェックを追加、完了画面に PR バッジ表示 |

### 主要指標の定義

| 項目 | 定義 |
|-----|------|
| **週の境界** | 月曜 00:00 ローカル時刻 |
| **ストリーク** | 今日トレ済み → 今日含む連続日数 / 今日未トレ → 昨日から遡る。データなしは 0 |
| **部位別回数** | レコード数（セット数ではなくセッション単位）で集計 |
| **週代表重量** | 週内の全セットにわたる最大重量 |
| **推移の 1RM** | 週内の全レコードの best1RM 最大値 |
| **10RM目標** | 週内最新レコードの nextTargetWeight |
| **ボリューム** | Σ(weight × reps)。今週 / 先週 比 > 1.1 → 重め、< 0.9 → 軽め |
| **PR 比較基準** | 保存時点での同種目の過去全レコードと比較（1RM・最大重量） |
| **CSV 形式** | 1行=1セット。列: date, exerciseId, exerciseName, setIndex, weight_kg, reps, best1RM_kg, nextTargetWeight_kg |
| **今月** | カレンダー月の 1 日 00:00 〜 現在 |

### チャートについて
SVG + 純粋 CSS による自作折れ線グラフを使用。外部チャートライブラリは追加なし。

### 手動確認手順

1. **ダッシュボード表示**: ホーム画面の「統計」ボタン → サマリー/推移・PR/カレンダー のタブ切替を確認
2. **PR バッジ**: 同種目を2回記録し、2回目が1RM 向上 → 完了画面に「自己ベスト更新！」バッジが出る
3. **CSV エクスポート**: ダッシュボード右上「CSV」→ ファイルがダウンロードされ、Excel で開いて文字化けしないことを確認

---

## テーマ変更（v3）

白・水色のスポーティーテーマに変更。アクセントは `#0ea5e9`（sky-500）、背景は `#f0f9ff`（sky-50）系の薄い水色を採用。ダークテーマを廃止しライトテーマに統一。

---

## デザイン更新の要点（v2）

| 項目 | 変更内容 |
|------|---------|
| デザイントークン | `tailwind.config.js` に `brand`・`surface` カラーパレット、日本語対応フォントスタック、`fade-up` アニメーションを定義 |
| タイポグラフィ | ページタイトル `text-xl font-bold tracking-tight`、セクションラベル `label-xs`（`text-xs uppercase tracking-wider`）、数値は `tabular-nums` で統一 |
| ページ骨格 | 全画面に「スティッキーヘッダー（`backdrop-blur` + `border-b`） → スクロール本文 → 固定フッター」の共通構造を適用 |
| ボタン階層 | Primary `h-14 bg-orange-500 rounded-xl shadow-lg`、Secondary `bg-slate-800`、Ghost `text-slate-400 hover:text-white` の 3 段階に整理 |
| インタラクション | 全タップ要素に `active:scale-[0.97〜0.98] transition-all`、`focus-visible:ring-2 focus-visible:ring-orange-500` を付与 |
| 空状態 | 履歴ゼロ時に「記録を始める」ボタン付きの説明、検索ヒットゼロ時に入力語を含むメッセージを表示 |
| アクセシビリティ | `htmlFor` によるラベル関連付け、`aria-pressed`・`aria-expanded`・`aria-label`・`aria-invalid` を整備。削除ボタンを SVG アイコン化して `aria-label` 付与 |
| フォント | `font-feature-settings: 'tnum' 1` でアプリ全体の数値を等幅表示 |

追加ライブラリなし。Tailwind CSS と既存スタックのみで完結。

---

## セットアップ

```bash
cd workout-tracker
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

## スクリプト一覧

| コマンド | 内容 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（dist/ へ出力） |
| `npm run preview` | ビルド結果をローカルでプレビュー |
| `npm test` | 単体テスト実行（vitest） |

## 技術スタック

| カテゴリ | 採用技術 | 選定理由 |
|---------|---------|---------|
| UI フレームワーク | React 18 + TypeScript | 型安全・エコシステムの豊富さ |
| ビルドツール | Vite 5 | 高速 HMR、ゼロ設定 PWA プラグイン |
| スタイリング | Tailwind CSS 3 | モバイルファーストのユーティリティ設計 |
| PWA | vite-plugin-pwa | Service Worker 自動生成、マニフェスト管理 |
| データ保存 | LocalStorage | オフライン対応・プライベート・実装が簡単 |
| テスト | Vitest | Vite ネイティブ、設定不要 |

## 起動フロー

```
初回: プロフィール設定 → 部位選択 → 種目選択 → 初回目安表示 → 記録
2回目以降: 部位選択 → 種目選択 → 前回記録から算出した目標表示 → 記録
```

## 計算ロジック

### 1RM 算出式: Epley 式

```
1RM = weight × (1 + reps / 30)
```

出典: Epley, B. (1985). *Poundage Chart*. Boyd Epley Workout.

> 注意: reps が 1〜10 の範囲で最も精度が高い。reps が増えるほど誤差が大きくなる傾向がある。

### 10RM 目標重量（次回目標）

Epley 式の逆関数から算出:

```
10RM 重量 = 1RM / (1 + 10/30) = 1RM × 0.75
```

### 初回目標重量の推定

体重に種目・性別ごとのマルチプライヤーを掛けて推定 1RM を算出し、そこから 10RM 重量を計算します。

```
推定初回 1RM = 体重 × マルチプライヤー（種目・性別で決定）
初回目標重量 = 推定 1RM × 0.75（Epley 式による 10RM 換算）
```

**マルチプライヤーの根拠:**
- *Starting Strength* (Mark Rippetoe) の初心者基準値を参考に設定
- ExRx.net の強度分類（Beginner レベル）も参照
- 男女差は一般的な筋力差（女性は男性の約 55〜65%）を反映
- 数値は科学的に厳密なものではなく、「初回セッションで安全に行える目安」として設定
- 個人差（運動歴・体型・年齢・コンディション）が大きいため、必ず余裕を持った重量から始めること

### 重量の丸め

算出値は 2.5 kg 単位（多くのジムの最小プレート単位）に丸めます。

## ファイル構成

```
src/
├── types/index.ts           # 型定義（Exercise, UserProfile, WorkoutRecord 等）
├── data/exercises.ts        # 部位・種目データ（7部位 × 約40種目）
├── lib/
│   ├── calculations.ts      # 1RM・10RM・初回目標の計算ロジック（純粋関数）
│   ├── calculations.test.ts # 単体テスト
│   └── storage.ts           # LocalStorage ラッパー
└── components/
    ├── ProfileSetup.tsx     # プロフィール設定（初回のみ）
    ├── BodyPartSelector.tsx # 部位選択画面
    ├── ExerciseSelector.tsx # 種目選択・検索画面
    ├── WorkoutSession.tsx   # ワークアウト記録・結果表示
    └── WorkoutHistory.tsx   # 履歴一覧（種目別グループ・展開表示）
```

## PWA インストール

本番ビルド後（`npm run build` → `npm run preview`）にモバイルブラウザで開き、「ホーム画面に追加」を選択するとアプリとして利用できます。

> **アイコンについて:** 開発用に SVG アイコン（`public/icon.svg`）を使用しています。本番デプロイ時は SVG から PNG（192×192 / 512×512）を生成し、`vite.config.ts` の manifest icons を更新することを推奨します。生成には `@vite-pwa/assets-generator` が使えます。

## デフォルト設定（仕様未定義部分）

| 項目 | デフォルト値 | 理由 |
|-----|------------|------|
| 目標レップ数 | 10 回 | 初心者・筋肥大に適した一般的な範囲 |
| デフォルトセット数 | 3 セット | 多くのトレーニングプログラムの標準 |
| 重量の丸め単位 | 2.5 kg | ジムの最小プレート単位 |
| 1RM 算出式 | Epley | シンプルで広く使われている |
| 10RM 算出 | Epley 逆関数（1RM × 0.75） | 1RM 式と整合する |
| データ保存場所 | LocalStorage | 簡単・オフライン対応 |
| 種目リスト表示上限（履歴展開時） | 最新 10 件 | パフォーマンスとユーザビリティのバランス |
