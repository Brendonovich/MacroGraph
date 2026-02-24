import {
	EffectButton,
	LoadingBlock,
	type SettingsProps,
} from "@macrograph/package-sdk/ui";
import { cx } from "cva";
import {
	type ComponentProps,
	createUniqueId,
	For,
	Suspense,
	splitProps,
} from "solid-js";
import { createStore } from "solid-js/store";

import { ClientRpcs, type ClientState } from "./shared";
import type { Port } from "./types";

const SERVER_STATE_INDICATOR = {
	running: { class: "bg-green-600", label: "Running" },
	stopped: { class: "bg-red-600", label: "Stopped" },
	error: { class: "bg-yellow-600", label: "Error" },
};

export default function Settings(
	props: SettingsProps<typeof ClientRpcs, typeof ClientState>,
) {
	return (
		<div class="flex flex-col gap-4">
			<AddServerForm {...props} />
			<div>
				<span class="text-gray-11 font-medium text-xs">WebSocket Servers</span>
				<Suspense fallback={<LoadingBlock />}>
					<ul class="rounded divide-y divide-gray-6 gap-4">
						<For
							each={props.state?.servers ?? []}
							fallback={
								<div class="p-2 text-center text-gray-11 italic">
									No Servers
								</div>
							}
						>
							{(srv) => <ServerListItem {...props} server={srv} />}
						</For>
					</ul>
				</Suspense>
			</div>
		</div>
	);
}

function AddServerForm(
	props: SettingsProps<typeof ClientRpcs, typeof ClientState>,
) {
	const [addServer, setAddServer] = createStore({
		port: 1890,
		displayName: "",
	});

	return (
		<div class="flex flex-col gap-3">
			<div class="flex flex-row gap-3 items-end">
				<div class="w-1/4">
					<InputField
						label="Port"
						type="number"
						min={0}
						max={65535}
						value={1890}
						onChange={(e) => setAddServer("port", Number(e.target.value))}
					/>
				</div>
				<div class="w-3/4">
					<InputField
						label="Display Name (Optional)"
						value=""
						placeholder="My Server"
						onChange={(e) => setAddServer("displayName", e.target.value)}
					/>
				</div>
				<EffectButton
					onClick={() =>
						props.rpc.StartServer({
							port: addServer.port as Port,
							displayName: addServer.displayName || undefined,
						})
					}
				>
					Start Server
				</EffectButton>
			</div>
		</div>
	);
}

function ServerListItem(
	props: SettingsProps<typeof ClientRpcs, typeof ClientState> & {
		server: (typeof ClientState.Type)["servers"][number];
	},
) {
	const server = () => props.server;
	const hasDisplayName = () => !!server().displayName;

	return (
		<li class="flex flex-row py-2 w-full">
			<div class="flex flex-col gap-0.5">
				<div class="flex flex-row items-center gap-2">
					<span class="font-medium">
						{server().displayName ?? `Port ${server().port}`}
					</span>
					{hasDisplayName() && (
						<span class="text-xs text-gray-11">(Port {server().port})</span>
					)}
				</div>
				<div class="flex flex-row items-center gap-2">
					<div
						class={cx(
							"size-2 rounded-full",
							SERVER_STATE_INDICATOR[server().state].class,
						)}
					/>
					<span class="text-xs text-gray-11">
						{SERVER_STATE_INDICATOR[server().state].label} (
						{server().clientCount} clients)
					</span>
				</div>
			</div>
			<div class="flex-1 flex flex-row justify-end items-center gap-1">
				<EffectButton
					variant="text"
					onClick={() =>
						server().state === "running"
							? props.rpc.StopServer({ port: server().port })
							: props.rpc.StartServer({
									port: server().port,
									displayName: server().displayName,
								})
					}
				>
					{server().state === "running" ? "Stop" : "Start"}
				</EffectButton>
				<EffectButton
					variant="textDanger"
					onClick={() => props.rpc.RemoveServer({ port: server().port })}
				>
					Remove
				</EffectButton>
			</div>
		</li>
	);
}

function InputField(props: { label: string } & ComponentProps<"input">) {
	const [labelProps, inputProps] = splitProps(props, ["label"]);
	const id = createUniqueId();

	return (
		<div class="flex flex-col gap-1 flex-1 items-stretch">
			<label for={id} class="font-medium text-xs text-gray-11">
				{labelProps.label}
			</label>
			<input
				id={id}
				class="bg-white/85 dark:bg-black/25 w-full h-8 text-sm px-2 ring-1 ring-gray-6 focus:ring-yellow-5 focus:outline-none"
				{...inputProps}
			/>
		</div>
	);
}

export const Rpcs = ClientRpcs;
