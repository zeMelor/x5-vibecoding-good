/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        x5: {
          green: '#5FAF2D',
          dark: '#1A3A1A',
          mint: '#EBF7E3',
          lime: '#7ED321',
          red: '#E31E24',
        },
      },
    },
  },
  plugins: [],
};
