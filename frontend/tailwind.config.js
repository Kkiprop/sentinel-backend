/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00FF99',
        background: '#0A0A0A',
        text: '#FFFFFF',
        muted: '#888888',
      },
    },
  },
  plugins: [],
};

