import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { For, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	const hostForm = createForm(() => ({
		defaultValues: { host: ctx.host().toNullable() ?? "" },
		onSubmit: ({ value }) => {
			if (value.host.length > 0) ctx.setHost(Some(value.host));
		},
	}));

	const codeForm = createForm(() => ({
		defaultValues: {
			securityCode: ctx.securityCode().toNullable() ?? "",
		},
		onSubmit: ({ value }) => {
			if (value.securityCode.length > 0)
				ctx.setSecurityCode(Some(value.securityCode));
		},
	}));

	return (
		<div class="flex flex-col space-y-4">
			<span class="text-neutral-400 font-medium">IKEA TRADFRI</span>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					hostForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<hostForm.Field name="host">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="Gateway IP (e.g. 192.168.1.100)"
						/>
					)}
				</hostForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					codeForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<codeForm.Field name="securityCode">
					{(field) => (
						<Input
							type="password"
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="Security Code (on gateway sticker)"
						/>
					)}
				</codeForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<Switch>
				<Match when={ctx.state().type === "disconnected"}>
					<div class="flex flex-row items-center space-x-4">
						<span class="text-neutral-500">Disconnected</span>
						<Button onClick={() => ctx.connect()} size="md">
							Connect
						</Button>
					</div>
				</Match>
				<Match when={ctx.state().type === "connecting"}>
					<div class="flex flex-row items-center space-x-4">
						<span class="text-yellow-400">Connecting...</span>
					</div>
				</Match>
				<Match when={ctx.state().type === "connected"}>
					<div class="flex flex-col space-y-2">
						<div class="flex flex-row items-center space-x-4">
							<span class="text-green-400">Connected</span>
							<Button onClick={() => ctx.disconnect()} size="md">
								Disconnect
							</Button>
						</div>
						<span class="text-neutral-400 text-sm">
							{ctx.devices().size} device{ctx.devices().size !== 1 ? "s" : ""} found
						</span>
						<ul class="text-sm text-neutral-500 space-y-1">
							<For each={[...ctx.devices().values()]}>
								{(device) => (
									<li>
										{device.name} ({device.deviceType})
										{device.reachable ? " ✅" : " ❌"}
									</li>
								)}
							</For>
						</ul>
					</div>
				</Match>
				<Match when={ctx.state().type === "error"}>
					{(() => {
						const s = ctx.state() as Extract<
							ReturnType<typeof ctx.state>,
							{ type: "error" }
						>;
						return (
							<div class="flex flex-col space-y-2">
								<span class="text-red-400">Error: {s.message}</span>
								<Button onClick={() => ctx.connect()} size="md">
									Retry
								</Button>
							</div>
						);
					})()}
				</Match>
			</Switch>
		</div>
	);
}
