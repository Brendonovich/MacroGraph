import { Effect, Stream } from "effect";
import { createSignal } from "solid-js";

import { type ConnectionStatus, ProjectRealtime } from "./Project/Realtime";

/**
 * Bridges the Effect-based connection status to a Solid.js reactive signal.
 * Components can read `status()` to reactively render connection state.
 */
export class ConnectionState extends Effect.Service<ConnectionState>()(
	"ConnectionState",
	{
		scoped: Effect.gen(function* () {
			const realtime = yield* ProjectRealtime;

			const [status, setStatus] = createSignal<ConnectionStatus>({
				_tag: "Connected",
				id: realtime.id,
				token: realtime.token,
			});

			// Subscribe to connection status changes and bridge to Solid.js signal
			yield* realtime.connectionStatus.changes.pipe(
				Stream.runForEach((s) =>
					Effect.sync(() => {
						setStatus(s);
					}),
				),
				Effect.forkScoped,
			);

			return { status };
		}),
		dependencies: [ProjectRealtime.Default],
	},
) {}
