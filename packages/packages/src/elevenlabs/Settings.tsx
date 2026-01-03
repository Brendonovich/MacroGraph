import { Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { createSignal, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function ({ setKey, key }: Ctx) {
	const [update, setUpdate] = createSignal("");

	const form = createForm(() => ({
		defaultValues: { key: key().unwrapOr("") },
		onSubmit: ({ value }) => {
			setKey(Some(value.key));
		},
	}));

	return (
		<div class="flex flex-col space-y-2">
			<span class="text-neutral-400 font-medium">Eleven Labs API</span>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
					setUpdate("hello");
					setTimeout(() => {
						setUpdate("");
					}, 1000);
				}}
				class="flex flex-row space-x-4"
			>
				<form.Field name="key">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							type="password"
							placeholder="Elevenlabs AI Key"
						/>
					)}
				</form.Field>
				<Button type="submit">Submit</Button>
			</form>
			<Switch>
				<Match when={update() === "hello"}>
					<span>Key Saved!</span>
				</Match>
			</Switch>
		</div>
	);
}
