import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";

const mgPackageSettings = "macrograph:package-settings";

export default defineConfig({
  plugins: [
    UnoCSS(),
    Icons({ compiler: "solid" }),
    {
      name: "macrograph-dev-load-settings",
      enforce: "pre",
      resolveId(id) {
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
    },
    solid(),
  ],
});
