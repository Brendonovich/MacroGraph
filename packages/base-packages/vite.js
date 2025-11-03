import * as fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const settingsExportId = "@macrograph/base-packages/Settings";

const BASE_URL = import.meta.url;

/** @type {import('vite').PluginOption} */
export default {
  name: "macrograph-base-packages-settings",
  enforce: "pre",
  resolveId(id) {
    if (id === settingsExportId) return `\0${settingsExportId}`;

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
    if (id !== `\0${settingsExportId}`) return;

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
  },
};
