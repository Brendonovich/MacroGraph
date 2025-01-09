import { Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";
import { t } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
	const context = createCtx();

	const pkg = new Package<Event>({
		name: "Voicemod",
		ctx: context,
		SettingsUI: () => import("./settings"),
	});

    pkg.createSchema({
		name: "Select Random Voice",
		type: "exec",
		createIO({ io }) {
			return {
				option: io.dataInput({
					id: "option",
					name: "option",
					type: t.string(),
					fetchSuggestions: async () => [
                        "FreeVoices",
                        "AllVoices",
                        "FavoriteVoices",
                        "CustomVoices"
                    ],
				}),
			};
		},
		async run({ ctx, io }) {
			const ws = context.state();

			const request = {
				action: "selectRandomVoice",
				id: "ThisDoesntMatter",
				payload: {
					mode: ctx.getInput(io.option),
				},
			};

			if (ws.isSome()) {
				ws.unwrap().send(JSON.stringify(request));
			}
		},
	});


    pkg.createSchema({
		name: "Set Background Effects State",
		type: "exec",
		createIO({ io }) {
			return {
				state: io.dataInput({
					id: "state",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx, io }) {
			const ws = context.state();

			const request = {
				action: "toggleBackground",
				id: "ThisDoesntMatter",
				payload: {},
			};

			if (ws.isSome() && context.backgroundEffects() !== ctx.getInput(io.state)) {
				ws.unwrap().send(JSON.stringify(request));
			}
		},
	});

    pkg.createSchema({
		name: "Set Hear Self State",
		type: "exec",
		createIO({ io }) {
			return {
				state: io.dataInput({
					id: "state",
					type: t.bool(),
				}),
			};
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

    pkg.createSchema({
		name: "Set Mic Mute State",
		type: "exec",
		createIO({ io }) {
			return {
				state: io.dataInput({
					id: "state",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx, io }) {
			const ws = context.state();

			const request = {
				action: "toggleMuteMic",
				id: "ThisDoesntMatter",
				payload: {},
			};

			if (ws.isSome() && context.micMute() !== ctx.getInput(io.state)) {
				ws.unwrap().send(JSON.stringify(request));
			}
		},
	});

	pkg.createSchema({
		name: "Set Voice",
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
				payload: {
					voiceID: context.voices().get(ctx.getInput(io.voice)),
				},
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
			return {
				state: io.dataInput({
					id: "state",
					type: t.bool(),
				}),
			};
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
		name: "Get Background Effects State",
		type: "pure",
		createIO({ io }) {
			return {
				status: io.dataOutput({
					id: "status",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.status, context.backgroundEffects());
		},
	});

    pkg.createSchema({
		name: "Get Hear Self State",
		type: "pure",
		createIO({ io }) {
			return {
				status: io.dataOutput({
					id: "status",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.status, context.hearVoice());
		},
	});

    pkg.createSchema({
		name: "Get Mic Mute State",
		type: "pure",
		createIO({ io }) {
			return {
				status: io.dataOutput({
					id: "status",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.status, context.micMute());
		},
	});

    pkg.createSchema({
		name: "Get Voices",
		type: "pure",
		createIO({ io }) {
			return {
				status: io.dataOutput({
					id: "voices",
					type: t.map(t.string()),
				}),
			};
		},
		run({ ctx, io }) {
            console.log(context.voices())
			ctx.setOutput(io.status, new ReactiveMap(context.voices()));
		},
	});

    pkg.createSchema({
		name: "Get Voice Changer State",
		type: "pure",
		createIO({ io }) {
			return {
				status: io.dataOutput({
					id: "status",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.status, context.voiceChanger());
		},
	});

	return pkg;
}
