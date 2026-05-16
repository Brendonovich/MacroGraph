/** Same Tailwind sources as web + interface so utility classes are generated for the editor. */
/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	presets: [require("@macrograph/interface/tailwind.config.js")],
};
