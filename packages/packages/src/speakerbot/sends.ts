import { t } from "@macrograph/typesystem";

import type { Pkg } from ".";
import type { Ctx } from "./ctx";

export function register(pkg: Pkg, { state }: Ctx) {
	const ws = () => {
		const ws = state();
		if (ws.type !== "connected") throw new Error("WebSocket not connected!");
		return ws.ws;
	};

	pkg.createSchema({
		name: "SpeakerBot Speak",
		type: "exec",
		createIO({ io }) {
			return {
				voice: io.dataInput({ id: "voice", name: "Voice", type: t.string() }),
				message: io.dataInput({
					id: "message",
					name: "Message",
					type: t.string(),
				}),
			};
		},
		run({ ctx, io }) {
			ws().send(
				JSON.stringify({
					voice: ctx.getInput(io.voice),
					message: ctx.getInput(io.message),
					id: "Macrograph",
					request: "Speak",
				}),
			);
		},
	});

	pkg.createSchema({
		name: "SpeakerBot Stop Current",
		type: "exec",
		createIO() {},
		run() {
			ws().send(JSON.stringify({ id: "Macrograph", request: "Stop" }));
		},
	});

	pkg.createSchema({
		name: "SpeakerBot Toggle TTS",
		type: "exec",
		createIO({ io }) {
			return {
				state: io.dataInput({ id: "state", name: "State", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ws().send(
				JSON.stringify({
					id: "Macrograph",
					request: ctx.getInput(io.state) ? "Enable" : "Disable",
				}),
			);
		},
	});

	pkg.createSchema({
		name: "SpeakerBot Events Toggle",
		type: "exec",
		createIO({ io }) {
			return {
				state: io.dataInput({ id: "state", name: "State", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ws().send(
				JSON.stringify({
					id: "Macrograph",
					request: "Events",
					state: ctx.getInput(io.state) ? "on" : "off",
				}),
			);
		},
	});

	pkg.createSchema({
		name: "SpeakerBot Queue Toggle",
		type: "exec",
		createIO({ io }) {
			return {
				state: io.dataInput({
					id: "state",
					name: "Queue Paused",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, io }) {
			ws().send(
				JSON.stringify({
					id: "Macrograph",
					request: ctx.getInput(io.state) ? "Pause" : "Resume",
				}),
			);
		},
	});

	pkg.createSchema({
		name: "SpeakerBot Queue Clear",
		type: "exec",
		createIO() {},
		run() {
			ws().send(JSON.stringify({ id: "Macrograph", request: "Clear" }));
		},
	});
}
