import { Button } from "@macrograph/ui";
import { getRemoteShellMode } from "@macrograph/runtime";
import { For, Match, Show, Suspense, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default (ctx: Ctx) => {
	const { access, requestAccess, io, hostMirrorMidi } = ctx;

	return (
		<div class="flex flex-col space-y-2">
			<Show when={getRemoteShellMode() && hostMirrorMidi()}>
				{(m) => (
					<div class="flex flex-row gap-2">
						<div class="flex-1">
							<span class="text-lg font-medium text-center">Inputs (host)</span>
							<ul class="w-full overflow-hidden min-w-0">
								<For each={m().inputs}>{(n) => <li class="truncate">{n}</li>}</For>
							</ul>
						</div>
						<div class="flex-1">
							<span class="text-lg font-medium text-center">Outputs (host)</span>
							<ul class="w-full overflow-hidden min-w-0">
								<For each={m().outputs}>{(n) => <li class="truncate">{n}</li>}</For>
							</ul>
						</div>
					</div>
				)}
			</Show>

			<Show when={getRemoteShellMode() && !hostMirrorMidi()}>
				<p class="text-sm text-neutral-500 mb-2">Waiting for host MIDI snapshot…</p>
			</Show>

			<Show when={!getRemoteShellMode()}>
				<Suspense fallback="Requesting MIDI Access...">
					<Switch>
						<Match when={access() === null}>
							MIDI Access Denied <Button onClick={requestAccess}>Retry</Button>
						</Match>
						<Match when={access() === undefined}>
							<Button onClick={requestAccess}>Request MIDI Access</Button>
						</Match>
						<Match when={access()}>
							<div class="flex flex-row gap-2">
								{(
									[
										["Inputs", io.inputs],
										["Outputs", io.outputs],
									] as const
								).map(([title, ports]) => (
									<div class="flex-1">
										<span class="text-lg font-medium text-center">{title}</span>
										<ul class="w-full overflow-hidden min-w-0">
											<For each={ports}>
												{(input) => (
													<li class="w-full overflow-hidden min-w-o truncate">
														{input.name}
													</li>
												)}
											</For>
										</ul>
									</div>
								))}
							</div>
						</Match>
					</Switch>
				</Suspense>
			</Show>
		</div>
	);
};
