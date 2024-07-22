import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { For, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default (ctx: Ctx) => {
	const form = createForm(() => ({
		defaultValues: { url: "ws://localhost:8001" },
		onSubmit: ({ value }) => {
			ctx.addInstance(value.url);
			form.reset();
		},
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
							{([url, instance]) => (
								<tr>
									<td>
										<span>{url}</span>
									</td>
									<td>
										<Switch>
											<Match when={instance.state === "connected"}>
												Connected
											</Match>
											<Match when={instance.state === "connecting"}>
												Connecting
											</Match>
											<Match when={instance.state === "disconnected"}>
												<span class="mr-4">Disconnected</span>
												<Button onClick={() => ctx.addInstance(url)}>
													Connect
												</Button>
											</Match>
										</Switch>
									</td>
									<td>
										<Button onClick={() => ctx.removeInstance(url)}>
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
					<div class="space-x-4 flex flex-row items-center">
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
						<Button type="submit" class="shrink-0" size="md">
							{!form.state.isSubmitting ? "Connect" : "Connecting..."}
						</Button>
					</div>
				</fieldset>
			</form>
		</>
	);
};
