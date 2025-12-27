import * as fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const settingsExportId = "@macrograph/base-packages/Settings";
const metaExportId = "@macrograph/base-packages/meta";

const BASE_URL = import.meta.url;

/** @type {import('vite').PluginOption} */
export default {
	name: "macrograph-base-packages-settings",
	enforce: "pre",
	resolveId(id) {
		if (id === settingsExportId) return `\0${settingsExportId}`;
		if (id === metaExportId) return `\0${metaExportId}`;

		if (id.startsWith(settingsExportId)) {
			const params = new URLSearchParams(id.slice(settingsExportId.length));

			return fileURLToPath(
				new URL(
					`./src/${params.get("package")}/Settings.tsx`,
					import.meta.url,
				).toString(),
			);
		}
	},
	async load(id) {
		if (id === `\0${metaExportId}`) {
			const files = await fs.readdir(new URL(`./src`, BASE_URL), {
				withFileTypes: true,
			});

			const packages = [];
			const imports = [];

			const getImportId = (() => {
				let i = 0;
				return () => i++;
			})();

			for (const folder of files) {
				if (!folder.isDirectory()) continue;
				console.log(folder);

				const iconUrl = new URL(
					`./src/${folder.name}/package-icon.png`,
					BASE_URL,
				);
				const hasIcon = await fs
					.readFile(iconUrl)
					.then(() => true)
					.catch(() => false);

				const iconImport = `icon${getImportId()}`;
				if (hasIcon)
					imports.push(`import ${iconImport} from "${iconUrl.pathname}"`);

				packages.push(
					`${folder.name}: ${JSON.stringify({
						name: folder.name,
						icon: hasIcon ? `$${iconImport}$` : undefined,
					})},`
						.replaceAll(`"$`, "")
						.replaceAll(`$"`, ""),
				);
			}

			console.log(packages);

			return `
      	${imports.join("\n")}
      	export default { ${packages.join("\n")} }
      `;
		} else if (id === `\0${settingsExportId}`) {
			const files = await fs.readdir(new URL(`./src`, BASE_URL));

			const packages = [];

			for (const folder of files) {
				const hasSettings = await fs
					.readFile(new URL(`./src/${folder}/Settings.tsx`, BASE_URL))
					.then(() => true)
					.catch(() => false);

				if (hasSettings)
					packages.push(
						`${folder}: () => import("@macrograph/base-packages/Settings?package=${folder}"),`,
					);
			}

			return `export default { ${packages.join("\n")} }`;
		}
	},
};
