import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [solid()],
	// test: {
	// 	reporters: process.env.GITHUB_ACTIONS
	// 		? ["default", new GithubActionsReporter()]
	// 		: [],
	// },
});
