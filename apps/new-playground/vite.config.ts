import { defineConfig, isRunnableDevEnvironment } from "vite";
import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import AutoImport from "unplugin-auto-import/vite";
import IconsResolver from "unplugin-icons/resolver";
import * as fs from "node:fs/promises";

const mgPackageSettings = "macrograph:package-settings";

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  environments: {
    client: { consumer: "client" },
    server: {
      consumer: "server",
      build: {
        ssr: true,
        // we don't write to the file system as the below 'capture-output' plugin will
        // capture the output and write it to the virtual file system
        write: true,
        manifest: true,
        copyPublicDir: false,
        rollupOptions: {
          input: "./src/entry-server.ts",
          output: {
            dir: "./server-out",
            entryFileNames: "server.mjs",
          },
        },
        commonjsOptions: {
          include: [/node_modules/],
        },
      },
    },
  },
  builder: {
    sharedPlugins: true,
    async buildApp(builder) {
      const clientEnv = builder.environments["client"];
      const serverEnv = builder.environments["server"];

      if (!clientEnv) throw new Error("Client environment not found");
      if (!serverEnv) throw new Error("SSR environment not found");

      await builder.build(clientEnv);
      await builder.build(serverEnv);
    },
  },
  plugins: [
    {
      name: "macrograph-dev-server",
      enforce: "pre",
      configureServer: async (server) => {
        const serverEnv = server.environments.server;
        if (!serverEnv) throw new Error("Server environment not found");
        if (!isRunnableDevEnvironment(serverEnv))
          throw new Error("Server environment is not runnable");

        await serverEnv.runner.import("./src/entry-server.ts").catch((e) => {
          console.error(e);
        });
      },
      config() {
        return {};
      },
    },
    UnoCSS(),
    AutoImport({
      resolvers: [
        IconsResolver({
          prefix: "Icon",
          extension: "jsx",
        }),
      ],
      dts: "./src/auto-imports.d.ts",
    }),
    Icons({ compiler: "solid", autoInstall: true }),
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
