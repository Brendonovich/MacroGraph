import {
	Context,
	Deferred,
	Effect,
	Either,
	PubSub,
	Scope,
	Stream,
	SynchronizedRef,
} from "effect";
import { dual } from "effect/Function";

export namespace LookupRef {
	type State<A, E> =
		| { _tag: "Empty" }
		| { _tag: "Loading"; deferred: Deferred.Deferred<A, E> }
		| { _tag: "Loaded"; value: A }
		| { _tag: "Refreshing"; value: A; deferred: Deferred.Deferred<A, E> };

	export interface LookupRef<A, E = never> {
		readonly get: Effect.Effect<A, E>;
		readonly changes: Stream.Stream<A, never>;
		readonly refresh: Effect.Effect<void, E>;
	}

	export const make = <A, E, R>(
		lookup: Effect.Effect<A, E, R>,
	): Effect.Effect<LookupRef<A, E>, never, R | Scope.Scope> =>
		Effect.gen(function* () {
			// Capture the environment and scope upfront so they're available in closures
			const env = yield* Effect.context<R | Scope.Scope>();
			const scope = Context.get(env, Scope.Scope);
			const boundLookup: Effect.Effect<A, E> = Effect.provide(lookup, env);

			const pubsub = yield* PubSub.unbounded<A>();
			const stateRef = yield* SynchronizedRef.make<State<A, E>>({
				_tag: "Empty",
			});
			const semaphore = yield* Effect.makeSemaphore(1);

			// Forks a lookup fiber into the parent scope, so lifecycle is tied to it
			const runLookup = (
				deferred: Deferred.Deferred<A, E>,
			): Effect.Effect<void> =>
				Effect.forkIn(
					Effect.gen(function* () {
						const result = yield* Effect.exit(boundLookup);
						yield* SynchronizedRef.set(
							stateRef,
							result._tag === "Success"
								? { _tag: "Loaded", value: result.value }
								: { _tag: "Empty" },
						);
						if (result._tag === "Success") {
							yield* PubSub.publish(pubsub, result.value);
						}
						yield* Deferred.done(deferred, result);
					}),
					scope,
				).pipe(Effect.asVoid);

			const get: Effect.Effect<A, E> = SynchronizedRef.modifyEffect(
				stateRef,
				(state) => {
					switch (state._tag) {
						case "Empty":
							return Effect.gen(function* () {
								const deferred = yield* Deferred.make<A, E>();
								yield* runLookup(deferred);
								return [
									Deferred.await(deferred),
									{ _tag: "Loading" as const, deferred },
								] as const;
							});
						case "Loading":
							return Effect.succeed([
								Deferred.await(state.deferred),
								state,
							] as const);
						case "Loaded":
							return Effect.succeed([
								Effect.succeed(state.value),
								state,
							] as const);
						case "Refreshing":
							return Effect.succeed([
								Effect.succeed(state.value),
								state,
							] as const);
					}
				},
			).pipe(Effect.flatten);

			const refresh: Effect.Effect<void, E> = SynchronizedRef.modifyEffect(
				stateRef,
				(state) => {
					switch (state._tag) {
						case "Empty":
							return Effect.gen(function* () {
								const deferred = yield* Deferred.make<A, E>();
								yield* runLookup(deferred);
								return [
									Deferred.await(deferred).pipe(Effect.asVoid),
									{ _tag: "Loading" as const, deferred },
								] as const;
							});
						case "Loading":
							return Effect.succeed([
								Deferred.await(state.deferred).pipe(Effect.asVoid),
								state,
							] as const);
						case "Loaded":
							return Effect.gen(function* () {
								const deferred = yield* Deferred.make<A, E>();
								yield* runLookup(deferred);
								return [
									Deferred.await(deferred).pipe(Effect.asVoid),
									{ _tag: "Refreshing" as const, value: state.value, deferred },
								] as const;
							});
						case "Refreshing":
							return Effect.succeed([
								Deferred.await(state.deferred).pipe(Effect.asVoid),
								state,
							] as const);
					}
				},
			).pipe(Effect.flatten);

			const changes: Stream.Stream<A, never> = Stream.unwrapScoped(
				semaphore.withPermits(1)(
					Effect.gen(function* () {
						const state = yield* SynchronizedRef.get(stateRef);

						const currentValue: Effect.Effect<A, E> = (() => {
							switch (state._tag) {
								case "Empty":
									return get;
								case "Loading":
									return Deferred.await(state.deferred);
								case "Loaded":
									return Effect.succeed(state.value);
								case "Refreshing":
									return Effect.succeed(state.value);
							}
						})();

						// Subscribe before awaiting current value to avoid missing emissions
						const subscription = yield* PubSub.subscribe(pubsub);
						const currentResult = yield* Effect.either(currentValue);

						return Stream.concat(
							Either.isRight(currentResult)
								? Stream.make(currentResult.right)
								: Stream.empty,
							Stream.fromQueue(subscription),
						);
					}),
				),
			);

			return { get, changes, refresh };
		});

	export const map: {
		<A, B>(f: (a: A) => B): <E>(self: LookupRef<A, E>) => LookupRef<B, E>;
		<A, E, B>(self: LookupRef<A, E>, f: (a: A) => B): LookupRef<B, E>;
	} = dual(
		2,
		<A, E, B>(self: LookupRef<A, E>, f: (a: A) => B): LookupRef<B, E> => ({
			get: self.get.pipe(Effect.map(f)),
			changes: self.changes.pipe(Stream.map(f)),
			refresh: self.refresh,
		}),
	);

	export const mapEffect: {
		<A, B, E2>(
			f: (a: A) => Effect.Effect<B, E2>,
		): <E>(self: LookupRef<A, E>) => LookupRef<B, E | E2>;
		<A, E, B, E2>(
			self: LookupRef<A, E>,
			f: (a: A) => Effect.Effect<B, E2>,
		): LookupRef<B, E | E2>;
	} = dual(
		2,
		<A, E, B, E2>(
			self: LookupRef<A, E>,
			f: (a: A) => Effect.Effect<B, E2>,
		): LookupRef<B, E | E2> => ({
			get: self.get.pipe(Effect.flatMap(f)),
			changes: self.changes.pipe(
				Stream.mapEffect(f),
				Stream.catchAll(() => Stream.make()),
			),
			refresh: self.refresh,
		}),
	);

	/**
	 * Creates a derived LookupRef whose value is recomputed via a pure function
	 * each time the source emits a new value. Unlike `map`, the derived ref
	 * subscribes to `source.changes` and re-evaluates on every emission, making
	 * it fully reactive. `refresh` on the derived ref triggers `refresh` on the
	 * source.
	 */
	export const derive: {
		<A, B>(
			f: (a: A) => B,
		): <E>(
			source: LookupRef<A, E>,
		) => Effect.Effect<LookupRef<B, E>, never, Scope.Scope>;
		<A, E, B>(
			source: LookupRef<A, E>,
			f: (a: A) => B,
		): Effect.Effect<LookupRef<B, E>, never, Scope.Scope>;
	} = dual(
		2,
		<A, E, B>(
			source: LookupRef<A, E>,
			f: (a: A) => B,
		): Effect.Effect<LookupRef<B, E>, never, Scope.Scope> =>
			make(source.get.pipe(Effect.map(f))).pipe(
				Effect.tap((derived) =>
					source.changes.pipe(
						Stream.tap(() => derived.refresh),
						Stream.runDrain,
						Effect.forkScoped,
					),
				),
			),
	);

	/**
	 * Creates a derived LookupRef whose value is recomputed via an effectful
	 * function each time the source emits a new value. `refresh` on the derived
	 * ref triggers `refresh` on the source.
	 */
	export const deriveEffect: {
		<A, B, E2, R>(
			f: (a: A) => Effect.Effect<B, E2, R>,
		): <E>(
			source: LookupRef<A, E>,
		) => Effect.Effect<LookupRef<B, E | E2>, never, Scope.Scope | R>;
		<A, E, B, E2, R>(
			source: LookupRef<A, E>,
			f: (a: A) => Effect.Effect<B, E2, R>,
		): Effect.Effect<LookupRef<B, E | E2>, never, Scope.Scope | R>;
	} = dual(
		2,
		<A, E, B, E2, R>(
			source: LookupRef<A, E>,
			f: (a: A) => Effect.Effect<B, E2, R>,
		): Effect.Effect<LookupRef<B, E | E2>, never, Scope.Scope | R> =>
			make(source.get.pipe(Effect.flatMap(f))).pipe(
				Effect.tap((derived) =>
					source.changes.pipe(
						Stream.tap(() => derived.refresh),
						Stream.runDrain,
						Effect.forkScoped,
					),
				),
			),
	);

	/**
	 * Transforms the `get` effect of a LookupRef with full control over the
	 * result type and error channel. The same transformation is applied to
	 * `changes` via `Stream.mapEffect`. `refresh` is passed through unchanged.
	 *
	 * This is the escape hatch for cases where `map` / `mapEffect` aren't
	 * expressive enough — e.g. silencing errors:
	 *
	 * ```ts
	 * LookupRef.mapGet(ref, (get) => get.pipe(Effect.catchAll(() => Effect.succeed([]))))
	 * ```
	 */
	export const mapGet: {
		<A, E, B, E2>(
			f: (get: Effect.Effect<A, E>) => Effect.Effect<B, E2>,
		): (self: LookupRef<A, E>) => LookupRef<B, E2>;
		<A, E, B, E2>(
			self: LookupRef<A, E>,
			f: (get: Effect.Effect<A, E>) => Effect.Effect<B, E2>,
		): LookupRef<B, E2>;
	} = dual(
		2,
		<A, E, B, E2>(
			self: LookupRef<A, E>,
			f: (get: Effect.Effect<A, E>) => Effect.Effect<B, E2>,
		): LookupRef<B, E2> => ({
			get: f(self.get),
			changes: self.changes.pipe(
				Stream.either,
				Stream.mapEffect(
					Either.match({
						onLeft: (e) => f(Effect.fail(e)),
						onRight: (a) => f(Effect.succeed(a)),
					}),
				),
				Stream.catchAll(() => Stream.make()),
			),
			refresh: self.refresh.pipe(Effect.catchAllCause(() => Effect.void)),
		}),
	);
}
