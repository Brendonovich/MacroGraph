/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  presets: [require("@macrograph/interface/tailwind.config.js")],
  plugins: [require("@tailwindcss/typography")],
};
