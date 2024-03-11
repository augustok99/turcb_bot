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
        "green-lite": "#369830",
        "blue-bold": "#2D0D38",
        "gray-custom": "#1E1C29"
      },
      backgroundImage: {
        "img-pantanal": "url('/src/img/pantanal.jpg')",
      },
    },
  },
  plugins: [],
};
