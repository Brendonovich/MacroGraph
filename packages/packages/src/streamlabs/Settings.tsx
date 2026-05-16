import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { getRemoteShellMode } from "@macrograph/runtime";
import { Match, Show, Suspense, Switch, createSignal } from "solid-js";

import { createForm } from "@tanstack/solid-form";
import type { Ctx } from "./ctx";

export default (ctx: Ctx) => {
	const { auth } = ctx;

	return (
		<div class="flex flex-col items-start space-y-2">
			<Show when={getRemoteShellMode() && ctx.streamlabsMirror()}>
				{(m) => (
					<div class="text-sm text-neutral-300 space-y-1 mb-2">
						<p>
							Socket: {m().socketPhase} · API key on host:{" "}
							{m().hasSocketToken ? "yes" : "no"}
						</p>
						<p>
							OAuth on host: {m().hasUserToken ? "yes" : "no"}
							{m().oauthDisplayName
								? ` (${m().oauthDisplayName})`
								: ""}
						</p>
					</div>
				)}
			</Show>
			<span class="text-neutral-400 font-medium">Socket API</span>
			<Switch fallback="Loading...">
				<Match when={!getRemoteShellMode() && auth.state().type === "disconnected"}>
					{(_) => {
						const form = createForm(() => ({
							defaultValues: { socketToken: "" },
							onSubmit: ({ value }) => {
								auth.setToken(Some(value.socketToken));
							},
						}));

						return (
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
								class="flex flex-row space-x-4"
							>
								<form.Field name="socketToken">
									{(field) => (
										<Input
											onInput={(e) =>
												field().handleChange(e.currentTarget.value)
											}
											onBlur={() => field().handleBlur()}
											value={field().state.value}
											type="password"
											placeholder="Socket API Key"
										/>
									)}
								</form.Field>
								<Button type="submit" class="shrink-0" size="md">
									Submit
								</Button>
							</form>
						);
					}}
				</Match>
				<Match when={!getRemoteShellMode() && auth.state().type === "connected"}>
					<div class="flex flex-row items-center space-x-4">
						<Button onClick={() => auth.setToken(None)}>Disconnect</Button>
					</div>
				</Match>
				<Match when={getRemoteShellMode()}>
					<span class="text-sm text-neutral-500">
						Streamlabs socket runs on the host.
					</span>
				</Match>
			</Switch>

			<Show when={!getRemoteShellMode()}>
				<span class="text-neutral-400 font-medium">OAuth</span>
				<Show when={auth.userToken().isSome()} fallback={<LogIn {...ctx} />}>
					<Suspense fallback="Authenticating...">
						<div class="flex flex-row items-center gap-2">
							<p>Logged in as {auth.user()?.streamlabs.display_name}</p>
							<Button onClick={() => auth.setUserToken(None)}>Log Out</Button>
						</div>
					</Suspense>
				</Show>
			</Show>
			<Show when={getRemoteShellMode()}>
				<span class="text-neutral-400 font-medium">OAuth</span>
				<p class="text-sm text-neutral-500 mt-1">Managed on the host.</p>
			</Show>
		</div>
	);
};

const LogIn = ({ core, auth: { setUserToken } }: Ctx) => {
	const [loggingIn, setLoggingIn] = createSignal(false);

	return (
		<Show
			when={!loggingIn()}
			fallback={
				<div class="flex space-x-4 items-center">
					<p>Logging in...</p>
					<Button onClick={() => setLoggingIn(false)}>Cancel</Button>
				</div>
			}
		>
			<Button
				onClick={async () => {
					setLoggingIn(true);

					try {
						const token = await core.oauth.authorize("streamlabs");

						if (!loggingIn()) return;

						setUserToken(Some(token));
					} finally {
						setLoggingIn(false);
					}
				}}
			>
				Login
			</Button>
			<p class="text-neutral-400 text-sm mt-2">
				Login may not work without approval of project maintainer
			</p>
		</Show>
	);
};
