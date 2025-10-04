import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/start/nitro-v2-plugin";
// @ts-expect-error
import mdx from "@vinxi/plugin-mdx";
// import unfonts from "unplugin-fonts/vite";

import interfacePlugin from "../../packages/ui/vite";

export default defineConfig({
	optimizeDeps: { exclude: ["fsevents", "@node-rs/bcrypt", "@node-rs/argon2"] },
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
		}),
		nitroV2Plugin({
			preset: "vercel",
			prerender: {
				crawlLinks: true,
				routes: ["/"],
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
