import basePackagesPlugin from "@macrograph/base-packages/vite";
import { Icons } from "@macrograph/icons/vite";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/start-nitro-v2-plugin";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

// import { nitro } from "nitro/vite";
// import unfonts from "unplugin-fonts/vite";

import interfacePlugin from "../../packages/ui/vite";

const nodeOnlyDeps = ["@node-rs/bcrypt", "@node-rs/argon2"];

export default defineConfig({
	optimizeDeps: { exclude: ["@effect/platform", "effect", ...nodeOnlyDeps] },
	ssr: { external: nodeOnlyDeps },
	build: { minify: false },
	plugins: [
		UnoCSS(),
		Icons(),
		basePackagesPlugin,
		solidStart({
			ssr: true,
			routeDir: "app",
			// extensions: ["md", "mdx"],
		}),
		nitroV2Plugin({
			preset: "vercel",
			prerender: { crawlLinks: true, routes: ["/", "/new-playground"] },
			externals: { external: nodeOnlyDeps },
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
