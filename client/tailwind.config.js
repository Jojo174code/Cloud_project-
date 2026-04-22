/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#d9e2ff',
          200: '#b3c5ff',
          300: '#8da9ff',
          400: '#678cff',
          500: '#416fff',
          600: '#3454cc',
          700: '#263d99',
          800: '#182766',
          900: '#0a1133',
        },
      },
    },
  },
  plugins: [],
};