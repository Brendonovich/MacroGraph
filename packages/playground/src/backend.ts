import * as Packages from "@macrograph/base-packages";
import {
	CloudApiToken,
	createEventStream,
	Credentials,
	EventsPubSub,
	GraphRequests,
	NodeRequests,
	ProjectData,
	ProjectPackages,
	ProjectRequests,
	ProjectRuntime,
	ProjectShape,
} from "@macrograph/project-backend";
import { Credential, Graph, type Project } from "@macrograph/project-domain";
import { Effect, Layer, Option, Schema, Stream, type Scope } from "effect";

import { Rpcs } from "./rpc";

const ProjectDataLive = Layer.effect(
	ProjectData,
	Effect.suspend(() =>
		Option.fromNullable(localStorage.getItem("mg-project")).pipe(
			Effect.andThen((v) =>
				Schema.decodeUnknown(Schema.parseJson(ProjectShape))(v),
			),
			Effect.catchAll(() =>
				Effect.succeed({
					name: "New Project",
					graphs: new Map([
						[
							Graph.Id.make(0),
							{ id: Graph.Id.make(0), name: "New Graph", nodes: [] },
						],
					]),
				}),
			),
		),
	),
);

export class PlaygroundBackend extends Effect.Service<PlaygroundBackend>()(
	"PlaygroundBackend",
	{
		scoped: Effect.gen(function* () {
			const projectRuntime = yield* ProjectRuntime;
			const project = yield* ProjectData;

			yield* projectRuntime
				.addPackage("util", Packages.util)
				.pipe(Effect.orDie);
			yield* projectRuntime
				.addPackage("twitch", Packages.twitch)
				.pipe(Effect.orDie);
			// yield* projectActions.addPackage("obs", Packages.obs).pipe(Effect.orDie);

			const eventStream = yield* createEventStream.pipe(
				Effect.map(
					Stream.tap((e) => {
						console.log(e);
						return Effect.sync(() => {
							localStorage.setItem(
								"mg-project",
								JSON.stringify(Schema.encodeSync(ProjectShape)(project)),
							);
						});
					}),
				),
			);

			return { eventStream };
		}),
		dependencies: [
			ProjectRuntime.Default,
			ProjectPackages.Default,
			EventsPubSub.Default,
		],
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
	Layer.provideMerge(ProjectRuntime.Default),
	Layer.provideMerge(
		Layer.succeed(CloudApiToken, Effect.succeed(Option.none())),
	),
	Layer.provide(ProjectDataLive),
) satisfies Layer.Layer<any, any, Scope.Scope>;
