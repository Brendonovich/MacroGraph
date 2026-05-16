import { Tooltip } from "@kobalte/core";
import { AsyncButton, Button } from "@macrograph/ui";
import { createAsync } from "@solidjs/router";
import { For, Match, Show, Suspense, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default ({
	core,
	auth,
	eventSub,
}: Ctx) => {
	const credentials = createAsync(() => core.getCredentials());

	return (
		<Suspense>
			<ul class="flex flex-col mb-2 space-y-2">
				<Show when={credentials()}>
					{(creds) => (
						<For each={creds().filter((cred) => cred.provider === "twitch")}>
							{(cred) => {
								const account = () => auth.accounts.get(cred.id);

								return (
									<li>
										<div class="flex flex-row items-center justify-between">
											<Tooltip.Root>
												<Tooltip.Trigger>
													<span>{cred.displayName}</span>
												</Tooltip.Trigger>
												<Tooltip.Portal>
													<Tooltip.Content class="bg-neutral-900 text-white border border-neutral-400 px-2 py-1 rounded">
														<Tooltip.Arrow />
													</Tooltip.Content>
												</Tooltip.Portal>
											</Tooltip.Root>
											<Show
												when={account()}
												children={
													<Button onClick={() => auth.disableAccount(cred.id)}>
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
										</div>
										<Show when={account()?.()}>
											{(account) => {
												const eventSubSocket = () =>
													eventSub.isLive(account().data.id);

												return (
													<div class="space-x-2">
														<Switch fallback="Connecting...">
															<Match when={eventSubSocket()}>
																<span>Connected</span>
															</Match>
															<Match
																when={eventSub.isConnecting(account().data.id)}
															>
																<span>Connecting...</span>
															</Match>
														</Switch>
													</div>
												);
											}}
										</Show>
									</li>
								);
							}}
						</For>
					)}
				</Show>
			</ul>
			<span class="text-sm text-gray-300">
				Access more accounts by{" "}
				<a class="underline" href="/credentials" target="external">
					adding credentials
				</a>
			</span>
		</Suspense>
	);
};
