/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layouts/**/*.html',
    './content/**/*.md',
    './assets/js/**/*.js',
    './data/labels.json',
  ],
  theme: {
    extend: {
      colors: {
        moduk: {
          purple: '#532a45',
          grey: '#323e48',
          dark: '#0b0c0c',
          black: '#050505',
          blue: '#1d70b8',
          light: '#f3f2f1',
        },
        sas: '#153e35',
        sbs: '#000033',
        srr: '#507255',
      },
      fontFamily: {
        industrial: ['Industrial Gothic Pro Single Line', 'Bebas Neue', 'Impact', 'sans-serif'],
        effra: ['Effra', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
