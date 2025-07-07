import type { ProjectEvent } from "@macrograph/server-domain";
import {
	Context,
	Effect,
	type Option,
	PubSub,
	Schema,
	Stream,
	type SubscriptionRef,
} from "effect";

export class RealtimePubSub extends Effect.Service<RealtimePubSub>()(
	"ProjectRealtime",
	{
		effect: Effect.gen(function* () {
			const pubsub =
				yield* PubSub.unbounded<[RealtimeConnectionId, ProjectEvent]>();

			return {
				publish: Effect.fn(function* (v: (typeof ProjectEvent)["Type"]) {
					const realtimeClient = yield* RealtimeConnection;

					return yield* pubsub.publish([realtimeClient.id, v]);
				}),
				subscribe: () => Stream.fromPubSub(pubsub),
			};
		}),
	},
) {}

export const RealtimeConnectionId = Schema.Number.pipe(
	Schema.brand("Realtime Client ID"),
);
export type RealtimeConnectionId = (typeof RealtimeConnectionId)["Type"];

export class RealtimeConnection extends Context.Tag("RealtimeConnection")<
	RealtimeConnection,
	{
		id: RealtimeConnectionId;
		authJwt: SubscriptionRef.SubscriptionRef<Option.Option<string>>;
	}
>() {}
