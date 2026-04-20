/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Noto Sans JP"',
          '"Yu Gothic UI"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        // ── Brand: sky-500 (#0ea5e9) を主軸にしたパレット ──────────────────
        brand: {
          50:  '#f0f9ff', // sky-50  — ページ下地
          100: '#e0f2fe', // sky-100 — カード境界・サブ面
          200: '#bae6fd', // sky-200 — 強めのボーダー
          300: '#7dd3fc', // sky-300
          400: '#38bdf8', // sky-400 — hover
          500: '#0ea5e9', // sky-500 — メインアクセント
          600: '#0284c7', // sky-600 — active / ラベル文字
          700: '#0369a1', // sky-700
        },
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
