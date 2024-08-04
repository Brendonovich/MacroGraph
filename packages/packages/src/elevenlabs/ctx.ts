import {
	None,
	type Option,
	Some,
	makePersistedOption,
} from "@macrograph/option";
import { ElevenLabsClient } from "elevenlabs";
import { createEffect, createSignal, on } from "solid-js";

const GPT_KEY = "ChatGptKey";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [state, setState] = createSignal<Option<ElevenLabsClient>>(None);

	const [key, setKey] = makePersistedOption(
		createSignal<Option<string>>(None),
		GPT_KEY,
	);

	createEffect(
		on(
			() => key(),
			(key) => {
				key.map((key) => {
					const api = new ElevenLabsClient({
						apiKey: key,
					});
					setState(Some(api));
				});
			},
		),
	);

	return { key, setKey, state, setState };
}
