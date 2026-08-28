import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { createCtx, type Ctx } from "./ctx";

export type Events = {
	deviceMessage: { device: string; payload: string; json: any };
	deviceEvent: { type: string; data: any };
};

export type Pkg = Package<Events, Ctx>;

export function pkg() {
	const ctx = createCtx((e) => pkg.emitEvent(e));

	const pkg = new Package<Events>({
		name: "Zigbee2MQTT",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.createEventSchema({
		event: "deviceMessage",
		name: "Device State",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				device: io.dataOutput({
					id: "device",
					name: "Device",
					type: t.string(),
				}),
				payload: io.dataOutput({
					id: "payload",
					name: "Payload (JSON)",
					type: t.string(),
				}),
			};
		},
		run({ ctx: runCtx, data, io }) {
			runCtx.setOutput(io.device, data.device);
			runCtx.setOutput(io.payload, data.payload);
			runCtx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		event: "deviceEvent",
		name: "Device Event",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				type: io.dataOutput({
					id: "type",
					name: "Event Type",
					type: t.string(),
				}),
				data: io.dataOutput({
					id: "data",
					name: "Data (JSON)",
					type: t.string(),
				}),
			};
		},
		run({ ctx: runCtx, data, io }) {
			runCtx.setOutput(io.type, data.type);
			runCtx.setOutput(io.data, JSON.stringify(data.data));
			runCtx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Set Device State",
		type: "exec",
		createIO({ io }) {
			return {
				device: io.dataInput({
					id: "device",
					name: "Device (friendly name)",
					type: t.string(),
				}),
				state: io.dataInput({
					id: "state",
					name: "State (JSON)",
					type: t.string(),
				}),
			};
		},
		async run({ ctx: runCtx, io }) {
			const device = runCtx.getInput(io.device);
			const state = runCtx.getInput(io.state);
			await ctx.publish(`zigbee2mqtt/${device}/set`, state);
		},
	});

	pkg.createSchema({
		name: "MQTT Publish",
		type: "exec",
		createIO({ io }) {
			return {
				topic: io.dataInput({
					id: "topic",
					name: "Topic",
					type: t.string(),
				}),
				message: io.dataInput({
					id: "message",
					name: "Message",
					type: t.string(),
				}),
			};
		},
		async run({ ctx: runCtx, io }) {
			const topic = runCtx.getInput(io.topic);
			const message = runCtx.getInput(io.message);
			await ctx.publish(topic, message);
		},
	});

	return pkg;
}
