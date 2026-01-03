import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import UnpluginIcons from "unplugin-icons/vite";

const FixedAutoImport = (options) => {
	const autoimport = AutoImport(options);

	const wrapTransform = (fn) => (src, id) => {
		const pathname = id.startsWith("/") ? new URL(`file://${id}`).pathname : id;
		return fn(src, pathname);
	};

	if (typeof autoimport.transform === "function") {
		autoimport.transform = wrapTransform(autoimport.transform);
	} else if (typeof autoimport.transform === "object") {
		autoimport.transform = wrapTransform(autoimport.transform.handler);
	}

	return autoimport;
};

export function Icons() {
	return [
		FixedAutoImport({
			resolvers: [IconsResolver({ prefix: "Icon", extension: "jsx" })],
			dts: new URL("./auto-imports.d.ts", import.meta.url).pathname,
		}),
		UnpluginIcons({ compiler: "solid" }),
	];
}
