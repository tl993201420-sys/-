/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 主色调：蓝绿强调
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#0891b2',
          600: '#0e7490',
          700: '#155e75',
        },
        // A股盈亏色：涨/盈=红，跌/亏=绿
        gain: '#e11d48',
        loss: '#16a34a',
      },
    },
  },
  plugins: [],
}
