import {
	makePersistedOption,
	None,
	type Option,
	Some,
} from "@macrograph/option";
import OpenAI from "openai";
import { createEffect, createSignal, on } from "solid-js";

const GPT_KEY = "ChatGptKey";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [state, setState] = createSignal<Option<OpenAI>>(None);

	const [key, setKey] = makePersistedOption(
		createSignal<Option<string>>(None),
		GPT_KEY,
	);

	createEffect(
		on(
			() => key(),
			(key) => {
				key.map((key) => {
					const api = new OpenAI({
						apiKey: key,
						dangerouslyAllowBrowser: true,
					});
					setState(Some(api));
				});
			},
		),
	);

	return { key, setKey, state, setState };
}
