import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export function pkg(execute: (cmd: string) => Promise<void>) {
	const pkg = new Package({ name: "Shell" });

	pkg.createSchema({
		type: "exec",
		name: "Execute Shell Command",
		createIO: ({ io }) => {
			return io.dataInput({ id: "command", name: "Command", type: t.string() });
		},
		run: async ({ ctx, io }) => {
			await execute(ctx.getInput(io));
		},
	});

	return pkg;
}
