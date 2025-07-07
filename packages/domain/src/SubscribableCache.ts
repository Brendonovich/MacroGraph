import { Cache, Duration, Effect, Mailbox, PubSub, Stream } from "effect";

export namespace SubscribableCache {
  export interface SubscribableCache<A, E> {
    get: Effect.Effect<A, E>;
    changes: () => Stream.Stream<void, never, never>;
    refresh: Effect.Effect<A, E>;
  }

  export const make = <A, E, R>(options: {
    readonly capacity: number;
    readonly timeToLive: Duration.DurationInput;
    readonly lookup: Effect.Effect<A, E, R>;
  }) =>
    Effect.gen(function* () {
      const changeNotifications = yield* PubSub.unbounded<void>();

      const cache = yield* Cache.make({
        capacity: options.capacity,
        timeToLive: options.timeToLive,
        lookup: (_: void) => options.lookup,
      });

      return {
        get: cache.get(),
        changes: () => Stream.fromPubSub(changeNotifications),
        refresh: cache
          .refresh()
          .pipe(Effect.zipRight(changeNotifications.offer())),
      } as SubscribableCache<A, E>;
    });
}
