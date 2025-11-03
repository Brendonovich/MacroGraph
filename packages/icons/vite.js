import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import UnpluginIcons from "unplugin-icons/vite";

export function Icons() {
	return [
		AutoImport({
			resolvers: [
				IconsResolver({
					prefix: "Icon",
					extension: "jsx",
				}),
			],
			dts: new URL("./auto-imports.d.ts", import.meta.url).pathname,
		}),
		UnpluginIcons({ compiler: "solid", autoInstall: false }),
	];
}
