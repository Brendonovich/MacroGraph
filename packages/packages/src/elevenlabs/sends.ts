import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { play } from "elevenlabs";

import type { Pkg } from ".";
import type { Ctx } from "./ctx";

type Message = {
	role: string;
	content: string;
};

type Choices = {
	finish_reason: string;
	index: number;
	message: Message;
};

const message = createStruct("message", (s) => ({
	role: s.field("role", t.string()),
	content: s.field("content", t.string()),
}));

const model = createEnum("model", (e) => [
	e.variant("gpt-3.5-turbo"),
	e.variant("gpt-4"),
]);

export function register(pkg: Pkg, state: Ctx) {
	pkg.createNonEventSchema({
		name: "ElevenLabs TTS",
		variant: "Base",
		createIO({ io }) {
			return {
				exec: io.execInput({
					id: "exec",
				}),
				voice: io.dataInput({
					id: "voice",
					name: "Voice",
					type: t.string(),
				}),
				directory: io.dataInput({
					id: "directory",
					name: "Directory",
					type: t.string(),
				}),
			};
		},
		async run({ ctx, io }) {
			const audio = await state.state().unwrap().generate({
				stream: true,
				voice: "IDEK",
				text: "testing this out to see what it returns",
				model_id: "eleven_multilingual_v2",
			});

			await play(audio);
		},
	});
}
