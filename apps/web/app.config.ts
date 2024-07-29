import { defineConfig } from "@solidjs/start/config";
// @ts-expect-error
import mdx from "@vinxi/plugin-mdx";
import dotenv from "dotenv";
// import unfonts from "unplugin-fonts/vite";

import interfacePlugin from "../../packages/ui/vite";

dotenv.config({ path: ".env.local" });

export default defineConfig({
	ssr: true,
	routeDir: "app",
	extensions: ["md", "mdx"],
	vite: {
		plugins: [
			interfacePlugin,
			mdx.default.withImports({})({
				jsx: true,
				jsxImportSource: "solid-js",
				providerImportSource: "solid-mdx",
			}),
			// unfonts({
			//   fontsource: {
			//     families: [
			//       {
			//         name: "Geist Sans",
			//         weights: [400, 500, 600, 700, 800, 900],
			//       },
			//     ],
			//   },
			// }),
		],
	},
	server: {
		preset: "vercel",
		prerender: {
			crawlLinks: true,
			routes: ["/landing"],
		},
	},
});
