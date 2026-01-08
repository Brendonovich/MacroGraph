import { t } from "@macrograph/typesystem-old";

import type { Pkg } from ".";

export function register(pkg: Pkg) {
	pkg.createEventSchema({
		name: "Level Change",
		event: "levelsChange",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({ id: "exec" }),
				channel: io.dataOutput({
					name: "Channel",
					id: "channel",
					type: t.string(),
				}),
				value: io.dataOutput({ name: "Value", id: "value", type: t.int() }),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.value, data.value);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "Button State",
		event: "buttonDown",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({ id: "exec" }),
				buttonName: io.dataOutput({
					name: "Button Name",
					id: "buttonName",
					type: t.string(),
				}),
				state: io.dataOutput({ name: "State", id: "state", type: t.bool() }),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.buttonName, data.buttonName);
			ctx.setOutput(io.state, data.state);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "Dial State",
		event: "effects",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({ id: "exec" }),
				buttonName: io.dataOutput({
					name: "Dial",
					id: "dial",
					type: t.string(),
				}),
				state: io.dataOutput({ name: "Amount", id: "amount", type: t.int() }),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.buttonName, data.dial);
			ctx.setOutput(io.state, data.amount);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "Channel Mute State",
		event: "faderStatus",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({ id: "exec" }),
				channel: io.dataOutput({
					name: "Channel",
					id: "channel",
					type: t.string(),
				}),
				state: io.dataOutput({ name: "State", id: "state", type: t.bool() }),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.state, data.state);
			ctx.exec(io.exec);
		},
	});
}
