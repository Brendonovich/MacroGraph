import * as Packages from "@macrograph/base-packages";
import { ProjectActions, ServerLive } from "@macrograph/server-backend";
import { Effect } from "effect";

const loadPackages = Effect.gen(function* () {
	const projectActions = yield* ProjectActions;

	yield* projectActions.addPackage("util", Packages.util).pipe(Effect.orDie);
	yield* projectActions
		.addPackage("twitch", Packages.twitch)
		.pipe(Effect.orDie);
	yield* projectActions.addPackage("obs", Packages.obs).pipe(Effect.orDie);
});

export const ServerEntry = Effect.zipRight(loadPackages, ServerLive);
