import { Button } from "@macrograph/ui";
import { getRemoteShellMode } from "@macrograph/runtime";
import { Match, Show, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	return (
		<div class="space-y-4 text-white">
			<Show when={getRemoteShellMode()}>
				<p class="text-sm text-neutral-500">
					Voicemod runs on the host. Enable and connect from the host app.
				</p>
			</Show>

			<Show when={!getRemoteShellMode()}>
				<p class="text-sm text-neutral-500">
					When enabled, MacroGraph connects to Voicemod and retries every 30s if
					the connection drops. When disabled, no connection is attempted.
				</p>
			</Show>

			<div class="flex flex-row items-center gap-4">
				<Switch>
					<Match when={!ctx.enabled()}>
						<span>Disabled</span>
					</Match>
					<Match when={ctx.state().isSome()}>
						<span>Connected</span>
					</Match>
					<Match when={ctx.connecting()}>
						<span>Connecting…</span>
					</Match>
					<Match when={true}>
						<span>Disconnected</span>
					</Match>
				</Switch>

				<Show when={!getRemoteShellMode()}>
					<Button onClick={() => ctx.setEnabled(!ctx.enabled())}>
						{ctx.enabled() ? "Disable" : "Enable"}
					</Button>
				</Show>
			</div>
		</div>
	);
}
