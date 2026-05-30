import { defineConfig } from "@solidjs/start/config";

import interfacePlugin from "../../packages/ui/vite";

export default defineConfig({
	ssr: false,
	routeDir: "app",
	server: {
		preset: "static",
	},
	vite: {
		plugins: [interfacePlugin],
		envPrefix: ["VITE_"],
		build: {
			minify: "esbuild",
			sourcemap: false,
		},
	},
});
