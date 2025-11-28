import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
	esbuild: {
		target: "es2020",
	},
	test: {
		include: ["test/**/*.test.ts"],
	},
};

export default config;
