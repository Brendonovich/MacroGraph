import { Context, Effect, Layer, Match, Stream } from "effect";
import type { ProjectEvent } from "@macrograph/project-domain/updated";
import { produce } from "solid-js/store";

import { PackageClients } from "./Packages/Clients";
import { ProjectState } from "./State";

export class ProjectEventStream extends Context.Tag("ProjectEventStream")<
	ProjectEventStream,
	Stream.Stream<ProjectEvent.ProjectEvent>
>() {}

const handleProjectEvent = Match.type<ProjectEvent.ProjectEvent>().pipe(
	Match.tags({
		PackageStateChanged: (e) =>
			Effect.gen(function* () {
				const pkgClients = yield* PackageClients;

				yield* pkgClients.getPackage(e.pkg).pipe(
					Effect.flatMap((p) => p.notifySettingsChange),
					Effect.catchAll(() => Effect.void),
				);
			}),
		PackageResourcesUpdated: (e) =>
			Effect.gen(function* () {
				const { setState } = yield* ProjectState;

				setState(
					"packages",
					produce((packages) => {
						const packageState = packages[e.package];
						if (!packageState) return;

						for (const [resource, values] of Object.entries(e.resources)) {
							const resourceState = packageState.resources[resource];
							if (!resourceState) continue;
							resourceState.values = values;
						}
					}),
				);
			}),
	}),
	Match.orElse(() => Effect.void),
);

export const ProjectEventHandlerLive = Layer.scopedDiscard(
	Effect.gen(function* () {
		// console.log(yield* Effect.context());
		const stream = yield* ProjectEventStream;
		yield* stream.pipe(
			Stream.runForEach(handleProjectEvent),
			Effect.forkScoped,
		);
	}),
);
