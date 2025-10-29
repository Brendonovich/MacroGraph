import basePackagesPlugin from "@macrograph/base-packages/vite";
import UnoCSS from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/start-nitro-v2-plugin";
import { nitro } from "nitro/vite";
// @ts-expect-error
import mdx from "@vinxi/plugin-mdx";
// import unfonts from "unplugin-fonts/vite";

import interfacePlugin from "../../packages/ui/vite";

const nodeOnlyDeps = ["@node-rs/bcrypt", "@node-rs/argon2"];

export default defineConfig((env) => ({
	optimizeDeps: { exclude: ["@effect/platform", ...nodeOnlyDeps] },
	ssr: { external: nodeOnlyDeps },
	build: { minify: false },
	plugins: [
		UnoCSS(),
		AutoImport({
			resolvers: [
				IconsResolver({
					prefix: "Icon",
					extension: "jsx",
				}),
			],
			dts: "./src/auto-imports.d.ts",
		}),
		Icons({ compiler: "solid", autoInstall: false }),
		basePackagesPlugin,
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
		nitroV2Plugin({
			preset: "vercel",
			prerender: { crawlLinks: true, routes: ["/", "/new-playground"] },
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
