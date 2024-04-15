import { For, Match, Suspense, Switch } from "solid-js";
import { Button } from "@macrograph/ui";

import { Ctx } from "./ctx";

export default ({ access, requestAccess, io }: Ctx) => {
	return (
		<div class="flex flex-col space-y-2">
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
		</div>
	);
};
