import { PluginOption } from "vite";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import AutoImport from "unplugin-auto-import/vite";
import { fileURLToPath } from "node:url";

const iconsResolver = IconsResolver({
  prefix: "Icon",
  extension: "jsx",
});

export default [
  AutoImport({
    dts: fileURLToPath(new URL("src/auto-imports.d.ts", import.meta.url).href),
    resolvers: [
      (name: string) => {
        console.log(name);
        return iconsResolver(name);
      },
    ],
  }),
  Icons({ compiler: "solid", scale: 1 }),
] satisfies PluginOption[];
