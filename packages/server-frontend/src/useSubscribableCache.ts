import type { SubscribableCache } from "@macrograph/project-domain";
import {
	type Accessor,
	createEffect,
	createResource,
	onCleanup,
} from "solid-js";
import { Effect, Fiber, Stream } from "effect";
import { createDeepSignal } from "@solid-primitives/resource";

import { useProjectRuntime } from "./AppRuntime";

export function useSubscribableCache<A, E>(
	cache: Accessor<SubscribableCache.SubscribableCache<A, E>>,
) {
	const projectRuntime = useProjectRuntime();

	const [state, actions] = createResource(
		cache,
		(cache) => cache.get.pipe(projectRuntime.runPromise),
		{ storage: createDeepSignal },
	);

	createEffect(() => {
		const fiber = cache()
			.changes()
			.pipe(
				Stream.runForEach(() =>
					Effect.sync(() => {
						actions.refetch();
					}),
				),
				projectRuntime.runFork,
			);

		onCleanup(() => Fiber.interrupt(fiber).pipe(projectRuntime.runFork));
	});

	return state;
}
