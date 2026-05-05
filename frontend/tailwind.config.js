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
        'mystic-rose': '#8B5E6B', // Darkened for better contrast (Ratio 4.5:1 on #FFFBFB)
        'mystic-gold': '#D4AF37', // Refined gold
        'mystic-sage': '#8A9A8A', // Darkened sage
        'mystic-cocoa': '#5D4D50',
      },
      fontFamily: {
        serif: ['"Noto Serif Display"', '"Noto Serif"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
