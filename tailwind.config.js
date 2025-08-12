export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PT Root UI"', 'sans-serif'],
      },
      fontSize: {
        18: ['18px', '145%'],
        16: ['16px', '145%'],
        14: ['14px', '145%'], 142: ['14px', '105%'],
        12: ['12px', '145%'],
      },
      colors: {
        'darkblue': '#153D8A',
        'blue': '#386AC8',
        'green': '#2CAD1B',
        'gray': '#D8D8D8',
        'yellow': '#E3AA41',
        'red': '#E44F4F'
      }
    },
  },
  plugins: [],
}