import { Button } from "@macrograph/ui";
import { For, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	return (
		<div class="flex flex-col space-y-4">
			<span class="text-neutral-400 font-medium">LIFX</span>

			<Switch>
				<Match when={ctx.state() === "idle"}>
					<div class="flex flex-row items-center space-x-4">
						<span class="text-neutral-500">Not scanning</span>
						<Button onClick={() => ctx.startObserving()} size="md">
							Discover Lights
						</Button>
					</div>
				</Match>
				<Match when={ctx.state() === "discovering"}>
					<div class="flex flex-row items-center space-x-4">
						<span class="text-yellow-400">Discovering...</span>
					</div>
				</Match>
				<Match when={ctx.state() === "ready"}>
					<div class="flex flex-col space-y-2">
						<div class="flex flex-row items-center space-x-4">
							<span class="text-green-400">Scanning</span>
							<Button onClick={() => ctx.stopObserving()} size="md">
								Stop
							</Button>
							<Button onClick={() => ctx.discover()} size="md">
								Refresh
							</Button>
						</div>
						<span class="text-neutral-400 text-sm">
							{ctx.devices().size} light{ctx.devices().size !== 1 ? "s" : ""} found
						</span>
						<ul class="text-sm text-neutral-500 space-y-1">
							<For each={[...ctx.devices().values()]}>
								{(device) => (
									<li>
										{device.label || device.id} ({device.addr})
									</li>
								)}
							</For>
						</ul>
					</div>
				</Match>
			</Switch>
		</div>
	);
}
