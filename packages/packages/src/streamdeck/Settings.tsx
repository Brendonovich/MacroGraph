import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	return (
		<Switch>
			<Match
				when={
					(ctx.state.type === "Stopped" || ctx.state.type === "Starting") &&
					ctx.state
				}
			>
				{(state) => {
					const form = createForm(() => ({
						defaultValues: { port: 1880 },
						onSubmit: ({ value }) => {
							ctx.startServer(value.port);
						},
					}));

					return (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
						>
							<fieldset
								class="flex flex-row space-x-4"
								disabled={state().type === "Starting"}
							>
								<form.Field name="port">
									{(field) => (
										<Input
											onInput={(e) =>
												field().handleChange(e.currentTarget.valueAsNumber)
											}
											onBlur={() => field().handleBlur()}
											value={field().state.value}
											type="number"
										/>
									)}
								</form.Field>
								<Button type="submit" class="shrink-0" size="md">
									{state().type === "Stopped"
										? "Start Server"
										: "Starting Server..."}
								</Button>
							</fieldset>
						</form>
					);
				}}
			</Match>
			<Match when={ctx.state.type === "Running" && ctx.state}>
				{(state) => (
					<div>
						<p>WebSocket server running</p>
						<p>
							{state().connected()
								? "Stream Deck connected"
								: "No Stream Deck connected"}
						</p>
						<Button onClick={state().stop}>Stop Server</Button>
					</div>
				)}
			</Match>
		</Switch>
	);
}
