import { Effect, Option, PubSub, Stream } from "effect";
import { Realtime, type ServerEvent } from "@macrograph/server-domain";

import type { ClientAuthJWT } from "./ClientAuth/ClientAuthJWT";

export class RealtimePubSub extends Effect.Service<RealtimePubSub>()(
	"ProjectRealtime",
	{
		effect: Effect.gen(function* () {
			const pubsub =
				yield* PubSub.unbounded<
					[Realtime.ConnectionId, ServerEvent.ServerEvent]
				>();

			return {
				publish: Effect.fn(function* (v: ServerEvent.ServerEvent) {
					const realtimeClient = yield* Realtime.Connection;

					return yield* pubsub.publish([realtimeClient.id, v]);
				}),
				subscribe: () => Stream.fromPubSub(pubsub),
			};
		}),
	},
) {}

export const getRealtimeConnection = Effect.gen(function* () {
	const connections = yield* RealtimeConnections;
	const connection = yield* Realtime.Connection;

	return connections.get(connection.id);
});

type ConnectionAuth = { jwt: ClientAuthJWT; userId: string; email: string };

export class RealtimeConnections extends Effect.Service<RealtimeConnections>()(
	"RealtimeConnections",
	{
		effect: Effect.sync(() => {
			const realtimeConnections = new Map<
				number,
				{ auth: Option.Option<ConnectionAuth> }
			>();

			return {
				get: (id: number) => Option.fromNullable(realtimeConnections.get(id)),
				set: (id: number, value: { auth: Option.Option<ConnectionAuth> }) =>
					realtimeConnections.set(id, value),
			};
		}),
	},
) {}
