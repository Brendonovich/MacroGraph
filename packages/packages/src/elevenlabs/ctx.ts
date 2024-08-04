import {
	None,
	type Option,
	Some,
	makePersistedOption,
} from "@macrograph/option";
import { createEffect, createSignal, on } from "solid-js";

const ELEVEN_KEY = "ChatGptKey";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [state, setState] = createSignal<Option<string>>(None);

	const [key, setKey] = makePersistedOption(
		createSignal<Option<string>>(None),
		ELEVEN_KEY,
	);

	createEffect(
		on(
			() => key(),
			(key) => {
				key.map((key) => {
					const api = key;
					setState(Some(api));
				});
			},
		),
	);

	return { key, setKey, state, setState };
}
