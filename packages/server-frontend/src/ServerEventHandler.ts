import { Context, Effect, Layer, Match, Stream } from "effect";
import type { ServerEvent } from "@macrograph/server-domain";

import { ConnectedClientsState } from "./ConnectedClientsState";
import { PresenceClients } from "./Presence/PresenceClients";

export class ServerEventStream extends Context.Tag("ServerEventStream")<
	ServerEventStream,
	Stream.Stream<ServerEvent.ServerEvent>
>() {}

export const ServerEventStreamHandlerLive = Layer.scopedDiscard(
	Effect.gen(function* () {
		const stream = yield* ServerEventStream;
		const presenceClients = yield* PresenceClients;
		const connectedClientsState = yield* ConnectedClientsState;

		const handler = Match.type<ServerEvent.ServerEvent>().pipe(
			Match.tags({
				ConnectedClientsChanged: (e: ServerEvent.ConnectedClientsChanged) =>
					Effect.sync(() => {
						connectedClientsState.updateCount(e.data);
					}),
				PresenceUpdated: (e: ServerEvent.PresenceUpdated) =>
					Effect.sync(() => {
						presenceClients.updatePresence(e.data);
					}),
			}),
			Match.orElse(() => Effect.void),
		);

		yield* stream.pipe(Stream.runForEach(handler), Effect.forkScoped);
	}),
);
