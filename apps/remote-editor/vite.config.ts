import path from "node:path";
import { fileURLToPath } from "node:url";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const VinxiAutoImport = (options: Parameters<typeof AutoImport>[0]) => {
	const autoimport = AutoImport(options);
	return {
		...autoimport,
		transform(src: string, id: string) {
			let pathname = id;
			if (id.startsWith("/")) {
				pathname = new URL(`file://${id}`).pathname;
			}
			return autoimport.transform(src, pathname);
		},
	};
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		solid(),
		VinxiAutoImport({
			dts: path.join(__dirname, "src/auto-imports.d.ts"),
			resolvers: [
				IconsResolver({
					prefix: "Icon",
					extension: "jsx",
				}),
			],
		}),
		Icons({ compiler: "solid", scale: 1 }),
	],
	css: {
		postcss: path.join(__dirname, "postcss.config.js"),
	},
	build: {
		outDir: path.resolve(__dirname, "../desktop/src-tauri/remote-public"),
		emptyOutDir: true,
	},
});
