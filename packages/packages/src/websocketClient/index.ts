import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { createCtx } from "./ctx";

export function pkg() {
	const sockets = createCtx((data) => pkg.emitEvent({ name: "wsEvent", data }));

	const getWebSocket = (ip: string) => {
		const ws = sockets.websockets.get(ip);
		if (ws?.state !== "connected") throw new Error();
		return ws.socket;
	};

	const pkg = new Package({
		name: "Websocket",
		ctx: sockets,
		SettingsUI: () => import("./Settings"),
	});

	pkg.createSchema({
		name: "WS Emit",
		type: "exec",
		createIO({ io }) {
			return {
				ip: io.dataInput({ id: "ip", name: "WS IP", type: t.string() }),
				data: io.dataInput({ id: "data", name: "Data", type: t.string() }),
			};
		},
		run({ ctx, io }) {
			getWebSocket(ctx.getInput(io.ip)).send(ctx.getInput(io.data));
		},
	});

	pkg.createEventSchema({
		event: "wsEvent",
		name: "WS Event",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				ip: io.dataOutput({ id: "ip", name: "WS IP", type: t.string() }),
				data: io.dataOutput({ id: "data", name: "Data", type: t.string() }),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.ip, data.ip);
			ctx.setOutput(io.data, data.data);
			ctx.exec(io.exec);
		},
	});

	return pkg;
}
