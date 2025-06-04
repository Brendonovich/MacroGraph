import { Effect, PubSub, Stream } from "effect";
import { ProjectEvent } from "../../shared";
import { RealtimeConnection, RealtimeConnectionId } from "./Connection";

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
