import { Package, type WsProvider } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { type Events, createCtx } from "./ctx";

export function pkg<TServer>(ws: WsProvider<TServer>) {
	const ctx = createCtx(ws, (e) => pkg.emitEvent(e));

	const pkg = new Package<Events>({
		name: "Stream Deck WebSocket",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.createEventSchema({
		event: "keyDown",
		name: "Stream Deck Key Down",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec", name: "" }),
			id: io.dataOutput({ id: "id", name: "Key ID", type: t.string() }),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.settings.id);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		event: "keyUp",
		name: "Stream Deck Key Up",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec", name: "" }),
			id: io.dataOutput({ id: "id", name: "Key ID", type: t.string() }),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.settings.id);
			ctx.exec(io.exec);
		},
	});

	return pkg;
}
