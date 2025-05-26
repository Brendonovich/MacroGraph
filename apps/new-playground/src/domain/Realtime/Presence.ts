import { Effect, Scope, SubscriptionRef } from "effect";

export class RealtimePresence extends Effect.Service<RealtimePresence>()(
  "RealtimePresence",
  {
    effect: Effect.gen(function* () {
      const numSubscriptions = yield* SubscriptionRef.make(0);

      return {
        registerToScope: Effect.gen(function* () {
          yield* SubscriptionRef.update(numSubscriptions, (s) => s + 1);

          yield* Scope.addFinalizer(
            yield* Scope.Scope,
            SubscriptionRef.update(numSubscriptions, (s) => s - 1),
          );
        }),
        changes: numSubscriptions.changes,
      };
    }),
  },
) {}
