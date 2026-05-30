import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	const channelForm = createForm(() => ({
		defaultValues: { channelName: ctx.channelName().toNullable() ?? "" },
		onSubmit: ({ value }) => {
			if (value.channelName.length > 0)
				ctx.setChannelName(Some(value.channelName));
		},
	}));

	const keyForm = createForm(() => ({
		defaultValues: { apiKey: ctx.apiKey().toNullable() ?? "" },
		onSubmit: ({ value }) => {
			if (value.apiKey.length > 0)
				ctx.setApiKey(Some(value.apiKey));
			else
				ctx.setApiKey(None);
		},
	}));

	return (
		<div class="flex flex-col space-y-4">
			<span class="text-neutral-400 font-medium">TikTok Live</span>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					channelForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<channelForm.Field name="channelName">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="TikTok Username"
						/>
					)}
				</channelForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					keyForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<keyForm.Field name="apiKey">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="Sign API Key (optional)"
						/>
					)}
				</keyForm.Field>
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
					{(() => {
						const s = ctx.state() as Extract<
							ReturnType<typeof ctx.state>,
							{ type: "connected" }
						>;
						return (
							<div class="flex flex-col space-y-2">
								<div class="flex flex-row items-center space-x-4">
									<span class="text-green-400">
										Connected via {s.connectionMethod}
									</span>
									<Button onClick={() => ctx.disconnect()} size="md">
										Disconnect
									</Button>
								</div>
							</div>
						);
					})()}
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
