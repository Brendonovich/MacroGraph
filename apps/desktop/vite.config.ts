// import { defineConfig } from "@solidjs/start/config";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

import { PluginOption } from "vite";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import AutoImport from "unplugin-auto-import/vite";
import { fileURLToPath } from "node:url";

const plugin = [
  AutoImport({
    dts: fileURLToPath(new URL("src/auto-imports.d.ts", import.meta.url).href),
    resolvers: [
      IconsResolver({
        prefix: "Icon",
        extension: "jsx",
      }),
    ],
  }),
  Icons({ compiler: "solid", scale: 1 }),
] as PluginOption[];
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solid(), plugin],
  // start: {
  //   ssr: false,
  //   solid: {} as any,
  //   server: {
  //     preset: "static",
  //     compressPublicAssets: false,
  //   },
  // },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
