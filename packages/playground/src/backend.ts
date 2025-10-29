import { Effect, Layer, Option } from "effect";
import * as Packages from "@macrograph/base-packages";
import {
	CloudApiToken,
	Credentials,
	GraphRequests,
	ProjectActions,
	ProjectRequests,
} from "@macrograph/project-backend";
import { Rpcs } from "./rpc";
import { Credential } from "@macrograph/project-domain";

class PlaygroundBackend extends Effect.Service<PlaygroundBackend>()(
	"PlaygroundBackend",
	{
		scoped: Effect.gen(function* () {
			const projectActions = yield* ProjectActions;

			yield* projectActions
				.addPackage("util", Packages.util)
				.pipe(Effect.orDie);
			yield* projectActions
				.addPackage("twitch", Packages.twitch)
				.pipe(Effect.orDie);
			yield* projectActions.addPackage("obs", Packages.obs).pipe(Effect.orDie);

			return {};
		}),
		dependencies: [ProjectActions.Default],
	},
) {}

const RpcsLive = Rpcs.toLayer(
	Effect.gen(function* () {
		const projectReqs = yield* ProjectRequests;
		const graphReqs = yield* GraphRequests;
		const credentials = yield* Credentials

		return {
			GetProject: Effect.request(projectReqs.GetProjectResolver),
			GetPackageSettings: Effect.request(projectReqs.GetPackageSettingsResolver),
			CreateNode: Effect.request(graphReqs.CreateNodeResolver),
			GetCredentials: () => credentials.get.pipe(
				Effect.map((v) =>
					v.map(
						(v) =>
							new Credential.Credential({
								providerId: v.provider,
								providerUserId: v.id,
								displayName: v.displayName,
							}),
					)
				),
				Effect.catchAll(() => Effect.die(null))
			)
		};
	}),
);

export const BackendLayers = Layer.empty.pipe(
	Layer.merge(PlaygroundBackend.Default),
	Layer.merge(RpcsLive),
	Layer.provide(Layer.mergeAll(ProjectRequests.Default, GraphRequests.Default, Credentials.Default)),
	Layer.provideMerge(ProjectActions.Default),
	Layer.provideMerge(
		Layer.succeed(CloudApiToken, Effect.succeed(Option.none())),
	),
);
