/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    fontFamily: {
      sans: ["Koulen", "sans-serif"],
    },
    extend: {
      colors: {
        "slate-gray": "#1E1E1E",
      },
    },
  },
  plugins: [],
};
