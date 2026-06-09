/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        panel: '#111832',
        panel2: '#151f3f',
        ink: '#edf2ff',
        muted: '#a9b6d8',
        cyan: '#56d7ff',
        violet: '#9d7cff',
        green: '#5ef0a1',
        yellow: '#ffd166',
        line: 'rgba(255,255,255,.12)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
}
