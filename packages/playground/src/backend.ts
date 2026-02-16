import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as S from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Packages from "@macrograph/base-packages";
import {
	Actor,
	Credential,
	NodesIOStore,
	Package,
	Project,
} from "@macrograph/project-domain";
import {
	GraphRequests,
	NodeRequests,
	ProjectEditor,
	ProjectRequests,
} from "@macrograph/project-editor";
import {
	CloudApiClient,
	CredentialsStore,
	EngineRegistry,
	NodeExecution,
	PackageActions,
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
		const packageActions = yield* PackageActions;

		return {
			GetProject: Effect.request(projectRequests.GetProjectResolver),
			CreateNode: Effect.request(graphRequests.CreateNodeResolver),
			ConnectIO: Effect.request(graphRequests.ConnectIOResolver),
			SetItemPositions: Effect.request(graphRequests.SetItemPositionsResolver),
			CreateGraph: Effect.request(projectRequests.CreateGraphResolver),
			DeleteGraphItems: Effect.request(graphRequests.DeleteGraphItemsResolver),
			DisconnectIO: Effect.request(graphRequests.DisconnectIOResolver),
			SetNodeProperty: Effect.request(nodeRequests.SetNodePropertyResolver),
			CreateResourceConstant: Effect.request(
				projectRequests.CreateResourceConstantResolver,
			),
			UpdateResourceConstant: Effect.request(
				projectRequests.UpdateResourceConstantResolver,
			),
			DeleteResourceConstant: Effect.request(
				projectRequests.DeleteResourceConstantResolver,
			),
			// GetPackageSettings: (req) => new Package.NotFound({ id: req.package }),
			GetPackageEngineState: Effect.request(
				packageActions.GetPackageEngineStateResolver,
			),
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

const EditorLive = Layer.scoped(
	ProjectEditor.ProjectEditor,
	Effect.gen(function* () {
		const storedProject = localStorage.getItem("mg-project.0");

		const project = yield* storedProject
			? S.decode(S.parseJson(Project.Project))(storedProject)
			: Effect.succeed(undefined);

		const editor = yield* ProjectEditor.make();

		for (const [id, pkg] of Object.entries(Packages)) {
			yield* editor.loadPackage(Package.Id.make(id), pkg);
		}

		if (project) yield* editor.loadProject(project);

		yield* (yield* editor.subscribe).pipe(
			Stream.throttle({ cost: Chunk.size, duration: "100 millis", units: 1 }),
			Stream.runForEach(
				Effect.fn(function* (_e) {
					const project = yield* editor.project;

					localStorage.setItem(
						"mg-project.0",
						JSON.stringify(yield* S.encode(Project.Project)(project)),
					);
				}),
			),
			Effect.forkScoped,
		);

		return editor;
	}),
);

const RuntimeLive = Layer.scoped(
	ProjectRuntime.ProjectRuntime,
	Effect.gen(function* () {
		const runtime = yield* ProjectRuntime.make();

		for (const [id, pkg] of Object.entries(Packages)) {
			yield* runtime.loadPackage(Package.Id.make(id), pkg);
		}

		return runtime;
	}),
);

export const BackendLive = Layer.mergeAll(RpcsLive).pipe(
	Layer.provideMerge(RuntimeLive),
	Layer.provideMerge(
		Layer.mergeAll(
			EditorLive,
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
			NodesIOStore.Default,
			EngineRegistry.EngineRegistry.Default,
		),
	),
	Layer.provideMerge(CloudApiClient.layer({ baseUrl: "/" })),
	Layer.provideMerge(FetchHttpClient.layer),
	Layer.provide(NodeExecution.Default),
) satisfies Layer.Layer<any, any, any>;
