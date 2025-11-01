import { Chunk, Effect, Mailbox, Option, Stream } from "effect";
import { ProjectEvent } from "@macrograph/project-domain";

import { ProjectPackages } from "./Project";

export const createEventStream = Effect.gen(function* () {
	const packages = yield* ProjectPackages;

	const packageStatesStream = yield* Chunk.fromIterable(
		packages.entries(),
	).pipe(
		Chunk.filterMap(([name, { state }]) =>
			state.pipe(
				Option.map((state) =>
					Effect.map(state.changes, (state) =>
						Stream.fromQueue(state).pipe(
							Stream.map((): (typeof ProjectEvent)["Type"] => ({
								type: "packageStateChanged",
								package: name,
							})),
						),
					),
				),
			),
		),
		Effect.all,
		Effect.map(Stream.mergeAll({ concurrency: "unbounded" })),
	);

	return Stream.mergeAll(
		[
			// packageStates,
			// authStream,
			// eventStream,
			packageStatesStream,
			// numSubscriptionsStream,
			// realtimeStream,
		],
		{ concurrency: "unbounded" },
	);
});
