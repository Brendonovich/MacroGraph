import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { createCtx } from "./ctx";

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
	const context = createCtx();

	const pkg = new Package<Event>({
		name: "Voicemod",
		ctx: context,
		SettingsUI: () => import("./settings"),
	});

	pkg.createSchema({
		name: "Set voice",
		type: "exec",
		createIO({ io }) {
			return {
				voice: io.dataInput({
					id: "voice",
					name: "Voice",
					type: t.string(),
					fetchSuggestions: async () => Array.from(context.voices().keys()),
				}),
			};
		},
		async run({ ctx, io }) {
			const ws = context.state();

			const request = {
				action: "loadVoice",
				id: "ThisDoesntMatter",
				payload: { voiceID: context.voices().get(ctx.getInput(io.voice)) },
			};

			if (ws.isSome()) {
				ws.unwrap().send(JSON.stringify(request));
			}
		},
	});

	pkg.createSchema({
		name: "Set Voice Changer State",
		type: "exec",
		createIO({ io }) {
			return { state: io.dataInput({ id: "state", type: t.bool() }) };
		},
		async run({ ctx, io }) {
			const ws = context.state();

			const request = {
				action: "toggleVoiceChanger",
				id: "ThisDoesntMatter",
				payload: {},
			};

			if (ws.isSome() && context.voiceChanger() !== ctx.getInput(io.state)) {
				ws.unwrap().send(JSON.stringify(request));
			}
		},
	});

	pkg.createSchema({
		name: "Set Hear Self State",
		type: "exec",
		createIO({ io }) {
			return { state: io.dataInput({ id: "state", type: t.bool() }) };
		},
		async run({ ctx, io }) {
			const ws = context.state();

			const request = {
				action: "toggleHearMyVoice",
				id: "ThisDoesntMatter",
				payload: {},
			};

			if (ws.isSome() && context.hearVoice() !== ctx.getInput(io.state)) {
				ws.unwrap().send(JSON.stringify(request));
			}
		},
	});

	return pkg;
}
