import { fileURLToPath } from "node:url";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import wasm from "vite-plugin-wasm";

// Workaround for https://github.com/solidjs/solid-start/issues/1374
const VinxiAutoImport = (options) => {
	const autoimport = AutoImport(options);

	return {
		...autoimport,
		transform(src, id) {
			let pathname = id;

			if (id.startsWith("/")) {
				pathname = new URL(`file://${id}`).pathname;
			}

			return autoimport.transform(src, pathname);
		},
	};
};

export default [
	VinxiAutoImport({
		dts: fileURLToPath(
			new URL("../../packages/ui/src/auto-imports.d.ts", import.meta.url).href,
		),
		resolvers: [
			IconsResolver({
				prefix: "Icon",
				extension: "jsx",
			}),
		],
	}),
	Icons({ compiler: "solid", scale: 1 }),
	wasm(),
];
