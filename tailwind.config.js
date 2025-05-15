/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'google-blue': '#1a73e8',
        'google-blue-hover': '#1765cc',
        'google-red': '#ea4335',
        'google-red-hover': '#d93025',
        'google-green': '#34a853',
        'google-yellow': '#fbbc05',
        'google-gray': '#5f6368',
        'google-gray-light': '#dadce0',
        'google-bg': '#f8f9fa',
        'google-bg-dark': '#202124',
      },
    },
  },
  plugins: [],
}
