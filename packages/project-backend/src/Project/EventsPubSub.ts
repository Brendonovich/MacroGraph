import { Effect, PubSub, Stream } from "effect";
import type { ProjectEvent } from "@macrograph/project-domain";

export class EventsPubSub extends Effect.Service<EventsPubSub>()(
	"EventsPubSub",
	{
		effect: Effect.gen(function* () {
			const pubsub = yield* PubSub.unbounded<ProjectEvent>();

			return {
				publish: Effect.fn(function* (v: ProjectEvent) {
					return yield* pubsub.publish(v);
				}),
				subscribe: () => Stream.fromPubSub(pubsub),
			};
		}),
	},
) {}
