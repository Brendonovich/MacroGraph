import { PluginOption } from "vite";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import AutoImport from "unplugin-auto-import/vite";

const url = new URL(import.meta.url);

export default [
  AutoImport({
    dts: `${url.pathname}/../src/auto-imports.d.ts`,
    resolvers: [
      IconsResolver({
        prefix: "Icon",
        extension: "jsx",
      }),
    ],
  }),
  Icons({ compiler: "solid", autoInstall: true, scale: 1 }),
] as PluginOption[];
