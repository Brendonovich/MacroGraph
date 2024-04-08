import { For, Match, Switch } from "solid-js";
import { Button, Input } from "@macrograph/ui";

import { Ctx } from "./ctx";
import { createForm } from "@modular-forms/solid";

export default ({ websockets, addWebsocket, removeWebsocket }: Ctx) => {
	const [, { Form, Field }] = createForm({
		initialValues: {
			ip: "",
		},
	});

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
			<Form
				onSubmit={(d) => addWebsocket(d.ip)}
				class="flex flex-row space-x-4"
			>
				<Field name="ip">
					{(field, props) => (
						<Input {...props} placeholder="WebSocket URL" value={field.value} />
					)}
				</Field>
				<Button type="submit">Add WebSocket</Button>
			</Form>
		</>
	);
};
