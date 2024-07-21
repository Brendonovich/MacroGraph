import { Button, Input } from "@macrograph/ui";
import { For, Match, Switch } from "solid-js";

import { createForm } from "@tanstack/solid-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import type { z } from "zod";
import type { Ctx } from "./ctx";
import { AUTH_SCHEMA } from "./ws";

export default function (ctx: Ctx) {
	const form = createForm<
		z.infer<typeof AUTH_SCHEMA>,
		ReturnType<typeof zodValidator>
	>(() => ({
		validatorAdapter: zodValidator(),
		validators: { onSubmit: AUTH_SCHEMA },
		onSubmit: ({ value }) => {
			ctx.addInstance(value.url, value.password);
			form.reset();
		},
		defaultValues: { url: "ws://localhost:4455" },
	}));

	return (
		<>
			<Switch>
				<Match when={ctx.instances.size !== 0}>
					<table class="mb-4 table-auto w-full text-white">
						<thead>
							<tr>
								<th class="pr-2 text-left">IP Address</th>
								<th class="pr-2 text-left">State</th>
							</tr>
						</thead>
						<For each={[...ctx.instances]}>
							{([ip, instance]) => (
								<tr>
									<td>
										<span>{ip}</span>
									</td>
									<td>
										<Switch>
											<Match when={instance.state === "connected" && instance}>
												Connected
											</Match>
											<Match when={instance.state === "connecting"}>
												Connecting
											</Match>
											<Match when={instance.state === "disconnected"}>
												<span class="mr-4">Disconnected</span>
												<Button onClick={() => ctx.connectInstance(ip)}>
													Connect
												</Button>
											</Match>
										</Switch>
									</td>
									<td>
										<Button onClick={() => ctx.removeInstance(ip)}>
											Remove
										</Button>
									</td>
								</tr>
							)}
						</For>
					</table>
				</Match>
			</Switch>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<fieldset disabled={form.state.isSubmitting} class="space-y-4">
					<div class="space-x-4 flex flex-row">
						<form.Field name="url">
							{(field) => (
								<Input
									onInput={(e) => field().handleChange(e.currentTarget.value)}
									onBlur={() => field().handleBlur()}
									value={field().state.value}
									placeholder="URL"
									required
								/>
							)}
						</form.Field>
						<form.Field name="password">
							{(field) => (
								<Input
									onInput={(e) => field().handleChange(e.currentTarget.value)}
									onBlur={() => field().handleBlur()}
									value={field().state.value}
									placeholder="Password"
									type="Password"
								/>
							)}
						</form.Field>
						<Button type="submit" class="shrink-0" size="md">
							{!form.state.isSubmitting ? "Connect" : "Connecting..."}
						</Button>
					</div>
				</fieldset>
			</form>
		</>
	);
}
