import { defineConfig } from "@solidjs/start/config";
import dotenv from "dotenv";
import interfacePlugin from "../../packages/ui/vite";

dotenv.config({ path: ".env.local" });

export default defineConfig({
	ssr: false,
	routeDir: "app",
	vite: {
		plugins: [interfacePlugin],
	},
	server: {
		preset: "vercel",
		prerender: {
			crawlLinks: true,
		},
	},
});
