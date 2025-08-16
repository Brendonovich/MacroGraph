import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
// @ts-expect-error
import mdx from "@vinxi/plugin-mdx";
import dotenv from "dotenv";
// import unfonts from "unplugin-fonts/vite";

import interfacePlugin from "../../packages/ui/vite";

dotenv.config({ path: ".env.local" });

export default defineConfig({
	build: { minify: false },
	plugins: [
		interfacePlugin,
		mdx.default.withImports({})({
			jsx: true,
			jsxImportSource: "solid-js",
			providerImportSource: "solid-mdx",
		}),
		solidStart({
			ssr: true,
			routeDir: "app",
			extensions: ["md", "mdx"],
			server: {
				preset: "vercel",
				prerender: {
					crawlLinks: true,
					routes: ["/landing"],
				},
			},
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
});
