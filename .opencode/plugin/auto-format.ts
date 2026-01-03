/**
 * Auto-format plugin
 * Runs `pnpm format` at the repository root after file writes
 */
export const AutoFormatPlugin = async ({ $, worktree }) => {
	return {
		"file.edited": async () => {
			try {
				console.log("Running pnpm format...");
				await $`cd ${worktree} && pnpm format`;
				console.log("Formatting complete!");
			} catch (error) {
				console.error("Failed to run pnpm format:", error);
			}
		},
	};
};
