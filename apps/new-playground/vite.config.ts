import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import * as fs from "node:fs/promises";

const mgPackageSettings = "macrograph:package-settings";

export default defineConfig({
  plugins: [
    UnoCSS(),
    Icons({ compiler: "solid" }),
    {
      name: "macrograph-dev-load-settings",
      enforce: "pre",
      resolveId(id) {
        if (id === mgPackageSettings) return `\0${mgPackageSettings}`;

        if (id.startsWith(mgPackageSettings)) {
          const params = new URLSearchParams(
            id.slice(`${mgPackageSettings}`.length),
          );

          return fileURLToPath(
            new URL(
              `./src/${params.get("package")}-package/Settings.tsx`,
              import.meta.url,
            ).toString(),
          );
        }
      },
      async load(id) {
        if (id !== `\0${mgPackageSettings}`) return;

        const files = await fs.readdir("./src");

        const packages: Array<string> = [];

        for (const folder of files.filter((n) => n.endsWith("-package"))) {
          const hasSettings = await fs
            .readFile(`./src/${folder}/Settings.tsx`)
            .then(() => true)
            .catch(() => false);

          if (hasSettings) {
            const name = folder.slice(0, -"-package".length);
            packages.push(
              `${name}: () => import("macrograph:package-settings?package=${name}"),`,
            );
          }
        }

        return `export default { ${packages.join("\n")} }`;
      },
    },
    solid(),
  ],
});
