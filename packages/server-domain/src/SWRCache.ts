import { Cache, Effect, MutableHashMap } from "effect";

export const make = <Key, Value, Error = never, Environment = never>(
	...[args]: Parameters<typeof Cache.make<Key, Value, Error, Environment>>
) =>
	Effect.gen(function* () {
		const inner = yield* Cache.make(args);

		const val = MutableHashMap.empty<Key, Value>();

		return {
			get: (k: Key) =>
				inner.get(k).pipe(Effect.tap((v) => MutableHashMap.set(val, k, v))),
			invalidate: (k: Key) =>
				inner
					.invalidate(k)
					.pipe(Effect.tap(() => MutableHashMap.remove(val, k))),
			invalidateAll: () =>
				inner.invalidateAll.pipe(Effect.tap(() => MutableHashMap.clear(val))),
		};
	});
