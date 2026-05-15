import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { For, Match, Show, Switch, createSignal } from "solid-js";

import type { Ctx } from "./ctx";

type EditCell = { keyUrl: string; field: "name" | "url" };

export default ({
	websockets,
	wsNames,
	addWebsocket,
	removeWebsocket,
	setDisplayName,
	changeWebsocketUrl,
}: Ctx) => {
	const [editing, setEditing] = createSignal<EditCell | null>(null);
	/** Escape unmounts the input and still fires `blur`; skip persisting that blur. */
	let skipBlurCommit = false;
	const form = createForm(() => ({
		defaultValues: { name: "", url: "" },
		onSubmit: ({ value }) => {
			const url = value.url.trim();
			if (!url) return;
			addWebsocket(url, value.name);
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
								<th class="pr-2 text-left">Name</th>
								<th class="pr-2 text-left">URL</th>
								<th class="pr-2 text-left">State</th>
								<th />
							</tr>
						</thead>
						<For each={[...websockets.entries()]}>
							{([key, value]) => (
								<tr>
									<td>
										<Show
											when={
												editing()?.keyUrl === key &&
												editing()?.field === "name"
											}
											fallback={
												<span
													class="cursor-text select-text rounded px-1 hover:bg-muted/50"
													title="Double-click to rename"
													onDblClick={() =>
														setEditing({
															keyUrl: key,
															field: "name",
														})
													}
												>
													{wsNames.get(key) ?? key}
												</span>
											}
										>
											<Input
												class="h-8 py-1"
												defaultValue={wsNames.get(key) ?? key}
												ref={(el) => {
													queueMicrotask(() => {
														el.focus();
														el.select();
													});
												}}
												onBlur={(e) => {
													if (skipBlurCommit) {
														skipBlurCommit = false;
														return;
													}
													setDisplayName(key, e.currentTarget.value);
													setEditing((ed) =>
														ed?.keyUrl === key && ed.field === "name"
															? null
															: ed,
													);
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														(e.currentTarget as HTMLInputElement).blur();
													}
													if (e.key === "Escape") {
														e.preventDefault();
														skipBlurCommit = true;
														setEditing((ed) =>
															ed?.keyUrl === key && ed.field === "name"
																? null
																: ed,
														);
													}
												}}
											/>
										</Show>
									</td>
									<td>
										<Show
											when={
												editing()?.keyUrl === key &&
												editing()?.field === "url"
											}
											fallback={
												<span
													class="cursor-text select-text break-all rounded px-1 hover:bg-muted/50"
													title="Double-click to edit URL"
													onDblClick={() =>
														setEditing({ keyUrl: key, field: "url" })
													}
												>
													{key}
												</span>
											}
										>
											<Input
												class="h-8 min-w-[12rem] py-1"
												defaultValue={key}
												ref={(el) => {
													queueMicrotask(() => {
														el.focus();
														el.select();
													});
												}}
												onBlur={(e) => {
													if (skipBlurCommit) {
														skipBlurCommit = false;
														return;
													}
													const v = e.currentTarget.value;
													const trimmed = v.trim();
													if (!trimmed) {
														setEditing((ed) =>
															ed?.keyUrl === key && ed.field === "url"
																? null
																: ed,
														);
														return;
													}
													if (trimmed === key) {
														setEditing((ed) =>
															ed?.keyUrl === key && ed.field === "url"
																? null
																: ed,
														);
														return;
													}
													const ok = changeWebsocketUrl(key, trimmed);
													if (ok) {
														setEditing(null);
													}
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														(e.currentTarget as HTMLInputElement).blur();
													}
													if (e.key === "Escape") {
														e.preventDefault();
														skipBlurCommit = true;
														setEditing((ed) =>
															ed?.keyUrl === key && ed.field === "url"
																? null
																: ed,
														);
													}
												}}
											/>
										</Show>
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
				class="flex flex-row flex-wrap items-end gap-4"
			>
				<form.Field name="name">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="Name (e.g. Media PC)"
						/>
					)}
				</form.Field>
				<form.Field name="url">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="ws://192.168.0.60:16852"
							class="min-w-[12rem]"
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
