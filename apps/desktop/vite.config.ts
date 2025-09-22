import { solidStart } from "@solidjs/start/config";
import { defineConfig } from "vite";

import interfacePlugin from "../../packages/ui/vite";

export default defineConfig({
	// https://vitejs.dev/config/
	plugins: [
		interfacePlugin,
		solidStart({
			ssr: false,
			routeDir: "app",
			server: {
				preset: "static",
			},
		}),
	],
	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	// prevent vite from obscuring rust errors
	// to make use of `TAURI_DEBUG` and other env variables
	// https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
	envPrefix: ["VITE_", "TAURI_"],
	build: {
		// Tauri supports es2021
		target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
		// don't minify for debug builds
		// minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_DEBUG,
		minify: false,
	},
});
