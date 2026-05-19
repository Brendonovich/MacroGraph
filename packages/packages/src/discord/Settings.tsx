import { AsyncButton, Button, Input } from "@macrograph/ui";
import { createAsync } from "@solidjs/router";
import { For, Show, Suspense, Switch } from "solid-js";

import { createForm } from "@tanstack/solid-form";
import { Match } from "solid-js";
import type { Ctx } from ".";

const CREDENTIALS_URL = "https://www.macrograph.app/account/credentials";

async function openCredentialsPage(e: MouseEvent) {
	e.preventDefault();
	if (typeof window !== "undefined" && "__TAURI_INVOKE__" in window) {
		const { open } = await import("@tauri-apps/api/shell");
		await open(CREDENTIALS_URL);
		return;
	}
	window.open(CREDENTIALS_URL, "_blank", "noopener,noreferrer");
}

export default function ({ core, auth, gateway }: Ctx) {
	const credentials = createAsync(() => core.getCredentials());

	const form = createForm(() => ({
		defaultValues: { botToken: "" },
		onSubmit: ({ value }) => {
			auth.addBot(value.botToken);
		},
	}));

	return (
		<div class="flex flex-col items-start space-y-4">
			<div class="flex flex-col gap-2 w-full">
				<span class="text-neutral-400 font-medium">OAuth account</span>
				<p class="text-xs text-neutral-500 leading-snug">
					OAuth accounts work for read nodes (user/guild info). To{" "}
					<strong class="font-medium text-neutral-300">send messages</strong> or
					listen for new messages, add a bot token below.
				</p>
				<div class="flex flex-row flex-wrap gap-2">
					<AsyncButton
						onClick={async () => {
							await core.oauth.authorize("discord");
						}}
						loadingChildren="Connecting..."
					>
						Connect Discord
					</AsyncButton>
					<Button size="md" onClick={openCredentialsPage}>
						Manage credentials
					</Button>
				</div>
				<ul class="flex flex-col mb-2 space-y-2 w-full">
					<Suspense>
						<Show when={credentials()}>
							{(creds) => (
								<For
									each={creds().filter((cred) => cred.provider === "discord")}
								>
									{(cred) => {
										const account = () => auth.accounts.get(cred.id);

										return (
											<li class="flex flex-row items-center justify-between 1-full">
												<span>{cred.displayName}</span>
												<Show
													when={account()}
													children={
														<Button
															onClick={() => auth.disableAccount(cred.id)}
														>
															Disable
														</Button>
													}
													fallback={
														<AsyncButton
															onClick={() => auth.enableAccount(cred.id)}
															loadingChildren="Enabling..."
														>
															Enable
														</AsyncButton>
													}
												/>
											</li>
										);
									}}
								</For>
							)}
						</Show>
					</Suspense>
				</ul>
			</div>

			<span class="text-neutral-400 font-medium">Bot</span>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<fieldset
					class="flex flex-row space-x-4"
					disabled={form.state.isSubmitting}
				>
					<form.Field name="botToken">
						{(field) => (
							<Input
								onInput={(e) => field().handleChange(e.currentTarget.value)}
								onBlur={() => field().handleBlur()}
								value={field().state.value}
								type="password"
								placeholder="Bot Token"
							/>
						)}
					</form.Field>
					<Button type="submit" size="md">
						Submit
					</Button>
				</fieldset>
			</form>

			<ul class="flex flex-col mb-2 space-y-2 w-full mt-4">
				<For each={[...auth.bots.entries()]}>
					{([token, bot]) => (
						<Show when={bot()}>
							{(bot) => {
								const gatewaySocket = () => gateway.sockets.get(bot().data.id);

								return (
									<li class="flex flex-col items-stretch 1-full space-y-1">
										<div class="flex flex-row justify-between items-center">
											<span class="text-lg font-medium">
												{bot().data.username}
											</span>
											<Button
												class="ml-auto"
												onClick={() => auth.removeBot(token)}
											>
												Log Out
											</Button>
										</div>
										<div class="flex flex-row items-center space-x-4">
											<Switch>
												<Match when={gatewaySocket()}>
													<p>Gateway Connected</p>
													<Button
														onClick={() =>
															gateway.disconnectSocket(bot().data.id)
														}
													>
														Disconnect
													</Button>
												</Match>
												<Match when={!gatewaySocket()}>
													<p>Gateway Disconnected</p>
													<AsyncButton
														onClick={() => gateway.connectSocket(bot())}
														loadingChildren="Connecting..."
													>
														Connect
													</AsyncButton>
												</Match>
											</Switch>
										</div>
									</li>
								);
							}}
						</Show>
					)}
				</For>
			</ul>
		</div>
	);
}
