import { createForm } from "@tanstack/solid-form";
import { Button, Input } from "@macrograph/ui";
import { For, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default ({ websockets, startServer, stopServer }: Ctx) => {
	const form = createForm(() => ({
		defaultValues: { port: 1890 },
		onSubmit: ({ value }) => startServer(value.port),
	}));

	return (
		<>
			<Switch>
				<Match when={websockets.size !== 0}>
					<table class="mb-2 table-auto w-full">
						<thead>
							<tr>
								<th class="pr-2 text-left">Port</th>
								<th class="pr-2 text-left">Clients</th>
							</tr>
						</thead>
						<For each={[...websockets.entries()]}>
							{([key, value]) => {
								return (
									<tr>
										<td>
											<span>{key}</span>
										</td>
										<td>
											<span>{value.connections.size} Connections</span>
										</td>
										<td>
											<Button onClick={() => stopServer(key)}>Remove</Button>
										</td>
									</tr>
								);
							}}
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
				class="flex flex-row space-x-4"
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
							min={0}
							max={65535}
						/>
					)}
				</form.Field>
				<Button type="submit" class="shrink-0" size="md">
					Start Server
				</Button>
			</form>
		</>
	);
};
