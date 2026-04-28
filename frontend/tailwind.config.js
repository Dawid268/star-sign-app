const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/*.{html,ts}'),
    join(__dirname, '../libs/**/*.{html,ts}'),
  ],
  theme: {
    extend: {
      colors: {
        'mystic-rose': '#D1A7B4',
        'mystic-gold': '#EAD2AC',
        'mystic-sage': '#B8C7B8',
        'mystic-cocoa': '#5D4D50',
      },
      fontFamily: {
        serif: ['"Noto Serif Display"', '"Noto Serif"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
