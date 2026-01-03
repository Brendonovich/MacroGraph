import { Maybe } from "@macrograph/option";
import { createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { writeBinaryFile } from "@tauri-apps/api/fs";

import type { Pkg } from ".";
import type { Ctx } from "./ctx";

export async function streamToArrayBuffer(
	stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function TextToSpeech(
	voiceID: string,
	body: any,
	filePath: string,
	ctx: Ctx,
) {
	let state: string | null;

	const response = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${voiceID}`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				"xi-api-key": ctx.key().unwrap(),
			},
			body: JSON.stringify(body),
		},
	);

	console.log(response);

	if (response.body && response.status === 200) {
		await writeBinaryFile(filePath, await streamToArrayBuffer(response.body));
		state = filePath;
	} else {
		state = null;
	}

	return state;
}

const voiceSettings = createStruct("Voice Settings", (s) => ({
	stability: s.field("Stability", t.float()),
	similarityBoost: s.field("Similarity Boost", t.float()),
	style: s.field("Style", t.option(t.float())),
	useSpeakerBoost: s.field("Use Speaker Boost", t.option(t.bool())),
}));

const elevenBody = createStruct("Body", (s) => ({
	language_code: s.field("Language Code", t.option(t.string())),
	voiceSettings: s.field("Voice Settings", t.option(t.struct(voiceSettings))),
	seed: s.field("Seed", t.option(t.int())),
	previousText: s.field("Previous Text", t.option(t.string())),
	nextText: s.field("Next Text", t.option(t.string())),
}));

type elevenBodyType = {
	text: string;
	model_id?: string;
	language_code: string;
	voice_settings?: {
		stability: number;
		similarity_boost: number;
		style?: number;
		use_speaker_boost?: boolean;
	};
	seed?: number;
	previous_text: string;
	next_text: string;
};

export function register(pkg: Pkg, state: Ctx) {
	pkg.createNonEventSchema({
		name: "ElevenLabs TTS",
		variant: "Exec",
		createIO({ io }) {
			return {
				text: io.dataInput({ id: "text", name: "Text", type: t.string() }),
				modelId: io.dataInput({
					id: "modelId",
					name: "Model Id",
					type: t.string(),
					fetchSuggestions: async () => [
						"eleven_turbo_v2_5",
						"eleven_multilingual_v2",
						"eleven_turbo_v2",
						"eleven_multilingual_v1",
						"eleven_monolingual_v1",
					],
				}),
				filePath: io.dataInput({
					id: "filePath",
					name: "File Path",
					type: t.string(),
				}),
				voiceId: io.dataInput({
					id: "voiceId",
					name: "Voice ID",
					type: t.string(),
				}),
				body: io.dataInput({
					id: "body",
					name: "Body",
					type: t.option(t.struct(elevenBody)),
				}),
				filePathOut: io.dataOutput({
					id: "filePathOut",
					name: "File Path",
					type: t.option(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const _voiceSettings = {};
			const body = {} as elevenBodyType;

			if (ctx.getInput(io.body).isSome()) {
				const data = ctx.getInput(io.body).unwrap();
				if (data.language_code.isSome())
					body.language_code = data.language_code.unwrap();
				if (data.seed.isSome()) body.seed = data.seed.unwrap();
				if (data.previousText.isSome())
					body.previous_text = data.previousText.unwrap();
				if (data.nextText.isSome()) body.next_text = data.nextText.unwrap();
				if (data.voiceSettings.isSome()) {
					const voice = data.voiceSettings.unwrap();
					body.voice_settings = {
						stability: voice.stability,
						similarity_boost: voice.similarityBoost,
					};
					if (voice.style.isSome())
						body.voice_settings.style = voice.style.unwrap();
					if (voice.useSpeakerBoost.isSome())
						body.voice_settings.use_speaker_boost =
							voice.useSpeakerBoost.unwrap();
				}
			}

			body.model_id = ctx.getInput(io.modelId);
			body.text = ctx.getInput(io.text);

			console.log(body);

			const response = await TextToSpeech(
				ctx.getInput(io.voiceId),
				body,
				ctx.getInput(io.filePath),
				state,
			);

			ctx.setOutput(io.filePathOut, Maybe(response));
		},
	});
}
