/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './layouts/**/*.html',
    './content/**/*.md',
    './static/js/**/*.js',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        'moduk-brand': '#532a45',
        'moduk-dark-grey': '#323e48',
        'moduk-light-grey': '#f3f2f1',
        'moduk-border': '#bfc1c3',
        'moduk-secondary': 'var(--moduk-text-secondary)',
        'army-green': '#153e35',
        'navy-blue': '#13284c',
      },
      fontFamily: {
        industrial: ['"Industrial Gothic Pro"', 'sans-serif'],
        body: ['Effra', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
