import { Context, Effect, Layer, Match, Stream } from "effect";
import type { ProjectEvent } from "@macrograph/project-domain";
import { produce } from "solid-js/store";

import { PackageClients } from "./Packages/Clients";
import { RuntimeState } from "./RuntimeState";

export class RuntimeEventStream extends Context.Tag("RuntimeEventStream")<
	RuntimeEventStream,
	Stream.Stream<ProjectEvent.RuntimeEvent>
>() {}

export class RuntimeEventHandler extends Effect.Service<RuntimeEventHandler>()(
	"RuntimeEventHandler",
	{
		effect: Effect.gen(function* () {
			const { setState } = yield* RuntimeState;
			const pkgClients = yield* PackageClients;

			return Match.type<ProjectEvent.RuntimeEvent>().pipe(
				Match.tags({
					PackageStateChanged: (e) =>
						Effect.gen(function* () {
							yield* pkgClients.getPackage(e.pkg).pipe(
								Effect.flatMap((p) => p.notifySettingsChange),
								Effect.catchAll(() => Effect.void),
							);
						}),
					PackageResourcesUpdated: (e) =>
						Effect.sync(() => {
							setState(
								produce((state) => {
									const pkgResources = (state.packageResources[e.package] ??=
										{});

									for (const [resource, values] of Object.entries(
										e.resources,
									)) {
										pkgResources[resource] = [...values];
									}
								}),
							);
						}),
				}),
				Match.orElse(() => Effect.void),
			);
		}),
		dependencies: [RuntimeState.Default, PackageClients.Default],
	},
) {}

export const RuntimeEventStreamHandlerLive = Layer.scopedDiscard(
	Effect.gen(function* () {
		const stream = yield* RuntimeEventStream;
		yield* stream.pipe(
			Stream.runForEach(yield* RuntimeEventHandler),
			Effect.forkScoped,
		);
	}),
);
