import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { getRemoteShellMode } from "@macrograph/runtime";
import { createForm } from "@tanstack/solid-form";
import { Match, Show, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	return (
		<div class="flex flex-col space-y-2">
			<span class="text-neutral-400 font-medium">Socket API</span>
			<Show when={getRemoteShellMode() && ctx.hostMirrorSpeakerbot()}>
				{(m) => (
					<p class="text-sm text-neutral-300">
						Host: {m().uiState}
						{m().url ? ` — ${m().url}` : ""}
					</p>
				)}
			</Show>
			<Show when={!getRemoteShellMode()}>
				<Switch fallback="Loading...">
					<Match when={ctx.state().type === "disconnected"}>
						{(_) => {
							const form = createForm(() => ({
								defaultValues: { url: "" },
								onSubmit: ({ value }) => {
									ctx.setUrl(Some(value.url));
								},
							}));

							return (
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									class="flex flex-row space-x-4"
								>
									<form.Field name="url">
										{(field) => (
											<Input
												onInput={(e) =>
													field().handleChange(e.currentTarget.value)
												}
												onBlur={() => field().handleBlur()}
												value={field().state.value}
												placeholder="Speakerbot WS URL"
											/>
										)}
									</form.Field>
									<Button type="submit" class="shrink-0" size="md">
										Submit
									</Button>
								</form>
							);
						}}
					</Match>
					<Match when={ctx.state().type === "connected"}>
						<div class="flex flex-row items-center space-x-4">
							<Button onClick={() => ctx.setUrl(None)}>Disconnect</Button>
						</div>
					</Match>
				</Switch>
			</Show>
		</div>
	);
}
