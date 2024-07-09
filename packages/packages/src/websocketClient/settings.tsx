import { createForm } from "@tanstack/solid-form";
import { Button, Input } from "@macrograph/ui";
import { For, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default ({ websockets, addWebsocket, removeWebsocket }: Ctx) => {
	const form = createForm(() => ({
		defaultValues: { ip: "" },
		onSubmit: ({ value }) => {
			addWebsocket(value.ip);
			form.reset();
		},
	}));

	return (
		<>
			<Switch>
				<Match when={websockets.size !== 0}>
					<table class="mb-4 table-auto w-full">
						<thead>
							<tr>
								<th class="pr-2 text-left">IP Address</th>
								<th class="pr-2 text-left">State</th>
							</tr>
						</thead>
						<For each={[...websockets.entries()]}>
							{([key, value]) => (
								<tr>
									<td>
										<span>{key}</span>
									</td>
									<td>
										<Switch>
											<Match when={value.state === "connected" && value}>
												Connected
											</Match>
											<Match when={value.state === "connecting"}>
												Connecting
											</Match>
											<Match when={value.state === "disconnected"}>
												<span class="mr-4">Disconnected</span>
												<Button onClick={() => addWebsocket(key)}>
													Connect
												</Button>
											</Match>
										</Switch>
									</td>
									<td>
										<Button onClick={() => removeWebsocket(key)}>Remove</Button>
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
				class="flex flex-row space-x-4"
			>
				<form.Field name="ip">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="WebSocket URL"
						/>
					)}
				</form.Field>
				<Button type="submit" class="shrink-0" size="md">
					Add WebSocket
				</Button>
			</form>
		</>
	);
};
