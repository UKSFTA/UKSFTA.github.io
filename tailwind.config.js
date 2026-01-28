/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layouts/**/*.html',
    './content/**/*.md',
    './data/labels.json',
  ],
  theme: {
    extend: {
      colors: {
        'tactical-black': '#050505',
        'tactical-dark': '#0a0a0a',
        'tactical-grey': '#121212',
        'uksf-gold': '#b3995d',
        'uksf-blue': '#002366',
        'uksf-green': '#153e35',
        'uksf-red': '#800000',
      },
      fontFamily: {
        industrial: ['Bebas Neue', 'Impact', 'sans-serif'],
        tactical: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'carbon-pattern': "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')",
        'noise-pattern': "url('https://www.transparenttextures.com/patterns/stardust.png')",
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        }
      }
    },
  },
  plugins: [],
};