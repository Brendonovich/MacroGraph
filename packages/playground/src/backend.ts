import * as Packages from "@macrograph/base-packages";
import {
	CloudApiToken,
	createEventStream,
	Credentials,
	GraphRequests,
	NodeRequests,
	ProjectActions,
	ProjectPackages,
	ProjectRequests,
} from "@macrograph/project-backend";
import { Credential, type Project } from "@macrograph/project-domain";
import { Effect, Layer, Option, type Scope } from "effect";

import { Rpcs } from "./rpc";

export class PlaygroundBackend extends Effect.Service<PlaygroundBackend>()(
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

			const eventStream = yield* createEventStream;

			return { eventStream };
		}),
		dependencies: [ProjectActions.Default, ProjectPackages.Default],
	},
) {}

const RpcsLive = Rpcs.toLayer(
	Effect.gen(function* () {
		const projectReqs = yield* ProjectRequests;
		const graphReqs = yield* GraphRequests;
		const nodeReqs = yield* NodeRequests;
		const credentials = yield* Credentials;

		return {
			GetProject: (r: Project.GetProject) =>
				Effect.request(r, projectReqs.GetProjectResolver).pipe(
					Effect.map(structuredClone),
				),
			GetPackageSettings: Effect.request(
				projectReqs.GetPackageSettingsResolver,
			),
			CreateNode: Effect.request(graphReqs.CreateNodeResolver),
			GetCredentials: () =>
				credentials.get.pipe(
					Effect.map((v) =>
						v.map(
							(v) =>
								new Credential.Credential({
									providerId: v.provider,
									providerUserId: v.id,
									displayName: v.displayName,
								}),
						),
					),
					Effect.catchAll(() => Effect.die(null)),
				),
			RefetchCredentials: () =>
				credentials.refresh.pipe(
					Effect.zipRight(credentials.get),
					Effect.map((v) =>
						v.map(
							(v) =>
								new Credential.Credential({
									providerId: v.provider,
									providerUserId: v.id,
									displayName: v.displayName,
								}),
						),
					),
					Effect.catchAll(() => Effect.die(null)),
				),
			SetNodePositions: Effect.request(nodeReqs.SetNodePositionsResolver),
			ConnectIO: Effect.request(graphReqs.ConnectIOResolver),
			DisconnectIO: Effect.request(graphReqs.DisconnectIOResolver),
			DeleteSelection: Effect.request(graphReqs.DeleteSelectionResolver),
		};
	}),
);

export const BackendLayers = Layer.empty.pipe(
	Layer.merge(PlaygroundBackend.Default),
	Layer.merge(RpcsLive),
	Layer.provide(
		Layer.mergeAll(
			ProjectRequests.Default,
			GraphRequests.Default,
			NodeRequests.Default,
			Credentials.Default,
		),
	),
	Layer.provideMerge(ProjectActions.Default),
	Layer.provideMerge(
		Layer.succeed(CloudApiToken, Effect.succeed(Option.none())),
	),
) satisfies Layer.Layer<any, any, Scope.Scope>;
