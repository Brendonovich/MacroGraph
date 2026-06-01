import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export function pkg(execute: (args: { command: string; shell: string }) => Promise<void>) {
	const pkg = new Package({ name: "Shell" });

	pkg.createSchema({
		type: "exec",
		name: "Execute Shell Command",
		properties: {
			shell: {
				name: "Engine",
				source: () => [
					{ id: "default", display: "Default" },
					{ id: "powershell", display: "PowerShell" },
					{ id: "cmd", display: "cmd" },
					{ id: "pwsh", display: "PowerShell Core (pwsh)" },
				],
			},
		},
		createIO: ({ io }) => {
			return io.dataInput({
				id: "command",
				name: "Command",
				type: t.string(),
			});
		},
		run: async ({ ctx, io, properties }) => {
			const shell = ctx.getProperty(properties.shell) ?? "default";
			await execute({ command: ctx.getInput(io), shell });
		},
	});

	return pkg;
}
