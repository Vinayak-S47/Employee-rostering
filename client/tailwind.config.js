/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdff',
          100: '#ccf2fc',
          200: '#99e4f8',
          300: '#5cccf1',
          400: '#29aede',
          500: '#0891b2',
          600: '#0772a1',
          700: '#0a5d83',
          800: '#0f4d6d',
          900: '#11415d',
        },
        slate: {
          850: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
