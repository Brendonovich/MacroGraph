import { fileURLToPath } from "node:url";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";

export default [
	AutoImport({
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
];
