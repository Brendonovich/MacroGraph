import { Tooltip } from "@kobalte/core";
import { AsyncButton, Button } from "@macrograph/ui";
import { getRemoteShellMode } from "@macrograph/runtime";
import { createAsync } from "@solidjs/router";
import { For, Match, Show, Suspense, Switch } from "solid-js";

import type { Ctx } from "./ctx";
import { remoteTwitchDisableAccount, remoteTwitchEnableAccount } from "./remoteHost";

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

export default ({
	core,
	auth,
	eventSub,
	hostMirrorTwitch,
}: Ctx) => {
	const credentials = createAsync(() => core.getCredentials());
	const remote = () => getRemoteShellMode();

	const mirrorSession = (credentialId: string) =>
		hostMirrorTwitch().find((r) => r.credentialId === credentialId)?.sessionStatus;

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
													<Button
														onClick={() =>
															remote()
																? void remoteTwitchDisableAccount(cred.id)
																: auth.disableAccount(cred.id)
														}
													>
														Disable
													</Button>
												}
												fallback={
													<AsyncButton
														onClick={() =>
															remote()
																? remoteTwitchEnableAccount(cred.id)
																: auth.enableAccount(cred.id)
														}
														loadingChildren="Enabling..."
													>
														Enable
													</AsyncButton>
												}
											/>
										</div>
										<Show when={account()?.()}>
											{(account) => {
												const userId = () => account().data.id;

												return (
													<div class="space-x-2">
														<Switch fallback="Disconnected">
															<Match
																when={
																	remote()
																		? mirrorSession(cred.id) === "live"
																		: eventSub.isLive(userId())
																}
															>
																<span>Connected</span>
															</Match>
															<Match
																when={
																	remote()
																		? mirrorSession(cred.id) === "connecting"
																		: eventSub.isConnecting(userId())
																}
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
			<Show when={remote()}>
				<p class="text-sm text-neutral-500 mb-2">
					Twitch connections run on the host; status updates live from the desktop app.
				</p>
			</Show>
			<span class="text-sm text-gray-300">
				Access more accounts by{" "}
				<a class="underline" href={CREDENTIALS_URL} onClick={openCredentialsPage}>
					adding credentials
				</a>
			</span>
		</Suspense>
	);
};
