import { Button, Input } from "@macrograph/ui";
import { getRemoteShellMode } from "@macrograph/runtime";
import { createForm } from "@tanstack/solid-form";
import { For, Match, Show, Switch, createSignal } from "solid-js";

import type { Ctx } from "./ctx";

type EditCell = { keyUrl: string; field: "name" | "url" };

export default (ctx: Ctx) => {
	const {
		websockets,
		wsNames,
		hostMirrorWs,
		addWebsocket,
		removeWebsocket,
		setDisplayName,
		changeWebsocketUrl,
	} = ctx;
	const [editing, setEditing] = createSignal<EditCell | null>(null);
	/** Escape unmounts the input and still fires `blur`; skip persisting that blur. */
	let skipBlurCommit = false;
	const form = createForm(() => ({
		defaultValues: { name: "", url: "" },
		onSubmit: ({ value }) => {
			const url = value.url.trim();
			if (!url) return;
			void addWebsocket(url, value.name);
			form.reset();
		},
	}));

	return (
		<>
			<Show when={getRemoteShellMode() && hostMirrorWs().length > 0}>
				<table class="mb-4 table-auto w-full">
					<thead>
						<tr>
							<th class="pr-2 text-left">Name</th>
							<th class="pr-2 text-left">URL</th>
							<th class="pr-2 text-left">State (host)</th>
						</tr>
					</thead>
					<tbody>
						<For each={hostMirrorWs()}>
							{(row) => (
								<tr>
									<td>{row.name}</td>
									<td class="break-all">{row.url}</td>
									<td>{row.state}</td>
								</tr>
							)}
						</For>
					</tbody>
				</table>
				<p class="text-sm text-neutral-500 mb-4">WebSocket clients run on the host.</p>
			</Show>

			<Show when={!getRemoteShellMode() || hostMirrorWs().length === 0}>
			<p class="text-sm text-neutral-500 mb-4">
				MacroGraph WebSocket <strong>servers</strong> are plain{" "}
				<code class="text-xs">ws://</code> only (no TLS). To connect to another
				MG instance on your LAN, use{" "}
				<code class="text-xs">ws://&lt;host-ip&gt;:&lt;port&gt;</code>, not{" "}
				<code class="text-xs">wss://</code>.
			</p>
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
												value={wsNames.get(key) ?? key}
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
												}}
												onKeyDown={(e) => {
													if (e.key === "Escape") {
														setEditing(null);
													}
													if (e.key === "Enter") {
														setDisplayName(key, e.currentTarget.value);
														setEditing(null);
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
												value={key}
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
													void changeWebsocketUrl(key, trimmed).then((ok) => {
														if (ok) setEditing(null);
													});
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
												<div>
													<div>Connecting</div>
													<Show when={value.lastError}>
														<p class="text-xs text-red-400 mt-1 max-w-md break-words">
															{value.lastError}
														</p>
													</Show>
												</div>
											</Match>
											<Match when={value.state === "disconnected"}>
												<div>
													<span class="mr-4">Disconnected</span>
													<Show when={value.lastError}>
														<p class="text-xs text-red-400 mt-1 max-w-md break-words">
															{value.lastError}
														</p>
													</Show>
													<Button
														class="mt-1"
														onClick={() => void addWebsocket(key)}
													>
														Connect
													</Button>
												</div>
											</Match>
										</Switch>
									</td>
									<td>
										<Button onClick={() => void removeWebsocket(key)}>
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
			</Show>
		</>
	);
};
