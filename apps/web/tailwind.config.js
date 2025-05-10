import preset from "@macrograph/interface/tailwind.config.js";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	presets: [preset],
	plugins: [typography],
};
