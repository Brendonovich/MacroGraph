import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
import { nitro } from "nitro/vite";
// @ts-expect-error
import mdx from "@vinxi/plugin-mdx";
// import unfonts from "unplugin-fonts/vite";

import interfacePlugin from "../../packages/ui/vite";

const nodeOnlyDeps = ["@node-rs/bcrypt", "@node-rs/argon2"];

export default defineConfig((env) => ({
	optimizeDeps: { exclude: nodeOnlyDeps },
	ssr: { external: nodeOnlyDeps },
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
			// extensions: ["md", "mdx"],
		}),
		env.command === "build" &&
			nitro({
				config: {
					preset: "vercel",
					prerender: { crawlLinks: true, routes: ["/"] },
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
}));
