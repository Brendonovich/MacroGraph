import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export function pkg(execute: (cmd: string) => Promise<void>) {
	const pkg = new Package({ name: "Shell" });

	pkg.createSchema({
		type: "exec",
		name: "Execute Shell Command",
		properties: {
			command: { name: "Command", type: t.string() },
		},
		createIO: () => {},
		run: async ({ ctx, properties }) => {
			await execute(ctx.getProperty(properties.command));
		},
	});

	return pkg;
}
