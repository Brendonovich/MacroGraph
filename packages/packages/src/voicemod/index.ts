import { Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
	const ctx = createCtx();

	const pkg = new Package<Event>({
		name: "Voicemod",
		ctx,
		SettingsUI: () => import("./settings"),
	});

	pkg.createNonEventSchema({
		event: "keyDown",
		name: "Stream Deck Key Down",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
				name: "",
			}),
			id: io.dataOutput({
				id: "id",
				name: "Key ID",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.settings.id);
			ctx.exec(io.exec);
		},
	});

	return pkg;
}
