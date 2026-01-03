import basePackagesPlugin from "@macrograph/base-packages/vite";
import { Icons } from "@macrograph/icons/vite";
import UnoCSS from "unocss/vite";
import { defineConfig, isRunnableDevEnvironment } from "vite";
import solid from "vite-plugin-solid";

const serverEnvironmentEntry = "./src/prod-server.ts";

export default defineConfig({
	server: {
		allowedHosts: true,
		proxy: {
			"/api": {
				ws: true,
				changeOrigin: true,
				target: "http://localhost:5678",
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	environments: {
		client: {
			consumer: "client",
			build: {
				ssr: false,
				rollupOptions: { output: { dir: "./dist/client" } },
			},
		},
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
					input: serverEnvironmentEntry,
					output: { dir: "./dist/server", entryFileNames: "index.mjs" },
				},
				commonjsOptions: { include: [/node_modules/] },
			},
		},
	},
	builder: {
		sharedPlugins: true,
		async buildApp(builder) {
			const clientEnv = builder.environments.client;
			const serverEnv = builder.environments.server;

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

				await serverEnv.runner.import("./src/dev-server").catch((e) => {
					console.error(e);
				});
			},
		},
		UnoCSS(),
		Icons(),
		basePackagesPlugin,
		solid(),
	],
});
