import { defineConfig } from "@solidjs/start/config";
import dotenv from "dotenv";
import interfacePlugin from "../../interface/vite";

dotenv.config({ path: ".env.local" });

export default defineConfig({
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
