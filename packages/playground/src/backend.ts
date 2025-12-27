import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { Chunk, Stream } from "effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as S from "effect/Schema";
import type * as Scope from "effect/Scope";
import * as Packages from "@macrograph/base-packages";
import { Actor, Credential, Project } from "@macrograph/project-domain";
import {
	CloudApiClient,
	CredentialsStore,
	GraphRequests,
	NodeRequests,
	PackageActions,
	ProjectRequests,
	ProjectRuntime,
	RuntimeActions,
} from "@macrograph/project-runtime";

import { Rpcs } from "./rpc";

const RpcsLive = Rpcs.toLayer(
	Effect.gen(function* () {
		const projectRequests = yield* ProjectRequests;
		const graphRequests = yield* GraphRequests;
		const nodeRequests = yield* NodeRequests;
		const credentials = yield* CredentialsStore.CredentialsStore;

		return {
			GetProject: () => projectRequests.getProject,
			CreateNode: graphRequests.createNode,
			ConnectIO: graphRequests.connectIO,
			SetItemPositions: graphRequests.setItemPositions,
			GetPackageSettings: projectRequests.getPackageSettings,
			CreateGraph: projectRequests.createGraph,
			DeleteGraphItems: graphRequests.deleteItems,
			DisconnectIO: graphRequests.disconnectIO,
			SetNodeProperty: nodeRequests.setNodeProperty,
			CreateResourceConstant: projectRequests.createResourceConstant,
			UpdateResourceConstant: projectRequests.updateResourceConstant,
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
		};
	}),
);

const RuntimeLive = Layer.scoped(
	ProjectRuntime.Current,
	Effect.gen(function* () {
		const storedProject = localStorage.getItem("mg-project.0");

		const proj = yield* storedProject
			? S.decode(S.parseJson(Project.Project))(storedProject)
			: Effect.succeed(undefined);

		const runtime = yield* ProjectRuntime.make();

		yield* Effect.gen(function* () {
			const allPackages: Array<keyof typeof Packages> = [
				"util",
				"twitch",
				"obs",
			];
			const packages = yield* PackageActions;
			for (const p of allPackages) {
				yield* packages.loadPackage(p, Packages[p] as any);
			}

			const runtimeActions = yield* RuntimeActions;
			if (proj) yield* runtimeActions.loadProject(proj);
		}).pipe(Effect.provideService(ProjectRuntime.Current, runtime));

		yield* runtime.events.pipe(
			(e) => Stream.fromPubSub(e),
			Stream.throttle({
				cost: Chunk.size,
				duration: "100 millis",
				units: 1,
			}),
			Stream.runForEach(
				Effect.fn(function* (e) {
					// console.log(e);

					const project = yield* runtime.projectRef;

					localStorage.setItem(
						"mg-project.0",
						JSON.stringify(yield* S.encode(Project.Project)(project)),
					);
				}),
			),
			Effect.forkScoped,
		);

		return runtime;
	}),
);

export const BackendLive = Layer.mergeAll(RpcsLive).pipe(
	Layer.provideMerge(
		Layer.mergeAll(
			RuntimeLive,
			Layer.succeed(Actor.Current, { type: "CLIENT", id: "PLAYGROUND" }),
		),
	),
	Layer.provideMerge(
		Layer.mergeAll(
			ProjectRequests.Default,
			GraphRequests.Default,
			NodeRequests.Default,
			PackageActions.Default,
			RuntimeActions.Default,
			CredentialsStore.layer,
		),
	),
	Layer.provideMerge(CloudApiClient.layer()),
	Layer.provideMerge(FetchHttpClient.layer),
) satisfies Layer.Layer<any, any, Scope.Scope>;
