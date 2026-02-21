import { Match, pipe } from "effect";
import { Show } from "solid-js";

import { ConnectionState } from "./ConnectionState";
import { useEffectService } from "./EffectRuntime";

export function ConnectionStatusBanner() {
	const { status } = useEffectService(ConnectionState);

	const message = () =>
		pipe(
			status(),
			Match.value,
			Match.when({ _tag: "Reconnecting" }, () => "Reconnecting..."),
			Match.when({ _tag: "Disconnected" }, () => "Disconnected"),
			Match.orElse(() => null),
		);

	return (
		<Show when={message()}>
			{(msg) => (
				<div class="bg-warning text-warning-foreground px-3 py-1.5 text-center text-xs font-medium">
					{msg()}
				</div>
			)}
		</Show>
	);
}
