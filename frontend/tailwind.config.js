/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        cyber: {
          bg: '#090d16',
          panel: '#0f1623',
          surface: '#161f30',
          border: '#1e293b',
          accent: '#10b981',
          accentHover: '#059669',
        },
      },
    },
  },
  plugins: [],
};