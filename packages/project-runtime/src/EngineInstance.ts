import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization, RpcServer } from "@effect/rpc";
import { Array, Effect, Layer, pipe, Record, type Scope, Stream } from "effect";
import { PackageEngine, type Resource } from "@macrograph/package-sdk";
import {
	LookupRef,
	NodesIOStore,
	type Package,
	type Project,
	ProjectEvent,
} from "@macrograph/project-domain";

import { CloudApiClient } from "./CloudApi";
import { CredentialsStore } from "./CredentialsStore";
import { EngineRegistry } from "./EngineRegistry";
import { ProjectRuntime } from "./ProjectRuntime";

export type EngineImplementationLayer = Layer.Layer<
	PackageEngine.EngineImpl,
	never,
	PackageEngine.CtxTag
>;

export type EngineMakeArgs = {
	pkgId: Package.Id;
	engine: PackageEngine.Any;
	getProject: Effect.Effect<Project.Project>;
};

const makeHttpClient = (rpcs: any, url: string) =>
	RpcClient.make(rpcs, { disableTracing: false }).pipe(
		Effect.provide(
			RpcClient.layerProtocolHttp({ url }).pipe(
				Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
			),
		),
	);

export type EngineInstanceClient = {
	readonly client: Layer.Layer<never, never, RpcServer.Protocol>;
	readonly runtime: Layer.Layer<never, never, RpcServer.Protocol>;
	readonly state: LookupRef.LookupRef<unknown, never>;
	readonly resources: Record<
		string,
		LookupRef.LookupRef<ReadonlyArray<Resource.Value>, never>
	>;
};

export namespace EngineInstanceClient {
	export const makeLocal = (
		args: EngineMakeArgs & { layer: EngineImplementationLayer },
	): Effect.Effect<
		EngineInstance.EngineInstance,
		never,
		| CredentialsStore
		| CloudApiClient.CloudApiClient
		| ProjectRuntime.ProjectRuntime
		| NodesIOStore
		| Scope.Scope
		| EngineRegistry.EngineRegistry
	> =>
		Effect.gen(function* () {
			const credentials = yield* CredentialsStore;
			const cloud = yield* CloudApiClient.CloudApiClient;
			const runtime = yield* ProjectRuntime.ProjectRuntime;
			const nodesIOStore = yield* NodesIOStore;
			const engines = yield* EngineRegistry.EngineRegistry;

			const credentialsRef = LookupRef.mapGet(credentials, (get) =>
				get.pipe(Effect.catchAll(() => Effect.succeed([]))),
			);

			const ctxLayer = Layer.succeed(PackageEngine.CtxTag, {
				emitEvent: (e) =>
					Effect.gen(function* () {
						yield* ProjectRuntime.handleEvent(args.pkgId, e).pipe(
							Effect.provideService(
								ProjectRuntime.CurrentProject,
								yield* args.getProject,
							),
							Effect.provideService(ProjectRuntime.ProjectRuntime, runtime),
							Effect.provideService(NodesIOStore, nodesIOStore),
							Effect.provideService(EngineRegistry.EngineRegistry, engines),
						);
					}).pipe(Effect.runPromise),
				dirtyState: Effect.gen(function* () {
					yield* runtime
						.publishEvent(
							new ProjectEvent.PackageStateChanged({ pkg: args.pkgId }),
						)
						.pipe(Effect.asVoid);

					yield* refreshState;
					yield* refreshResources;
				}),
				credentials: credentialsRef,
				refreshCredential: (provider, id) =>
					cloud
						.refreshCredential({
							path: { providerId: provider, providerUserId: id },
						})
						.pipe(
							Effect.catchAll(() => Effect.void),
							Effect.zipRight(
								credentials.refresh.pipe(Effect.catchAll(() => Effect.void)),
							),
						),
			});

			const instance = yield* EngineInstance.make({
				def: args.engine,
				layer: args.layer,
			}).pipe(Effect.provide(ctxLayer));

			yield* credentials.changes.pipe(
				Stream.runForEach(() => instance.state.refresh),
				Effect.forkScoped,
			);

			yield* pipe(
				Record.toEntries(instance.resources),
				Array.map(([key, cache]) =>
					cache.changes.pipe(
						Stream.tap((values) =>
							Effect.log(
								`Resource '${args.pkgId}:${key}' changed with ${values.length} values`,
							),
						),
						Stream.map(
							(values) =>
								new ProjectEvent.PackageResourcesUpdated({
									package: args.pkgId,
									resources: { [key]: values },
								}),
						),
					),
				),
				Stream.mergeAll({ concurrency: "unbounded" }),
				Stream.runForEach(runtime.publishEvent),
				Effect.forkScoped,
			);

			const refreshResources: Effect.Effect<void> = Effect.all(
				Record.map(instance.resources, (cache) => cache.refresh),
			).pipe(Effect.asVoid);
			const refreshState: Effect.Effect<void> = instance.state.refresh;

			return instance;
		});

	export const makeRemote = (args: EngineMakeArgs & { url: string }) =>
		Effect.gen(function* () {
			const client = yield* makeHttpClient(args.engine.clientRpcs, args.url);
			const runtime = yield* makeHttpClient(args.engine.runtimeRpcs, args.url);

			return {
				client,
				runtime,
				state: Effect.dieMessage("Remote engine state is not available"),
			} as unknown as EngineInstanceClient;
		});
}

export namespace EngineInstance {
	export interface EngineInstance {
		readonly client: Layer.Layer<never, never, RpcServer.Protocol>;
		readonly runtime: Layer.Layer<never, never, RpcServer.Protocol>;
		readonly state: LookupRef.LookupRef<unknown, never>;
		readonly resources: Record<
			string,
			LookupRef.LookupRef<Array<Resource.Value>, never>
		>;
	}

	export const make = (opts: {
		def: PackageEngine.Any;
		layer: EngineImplementationLayer;
	}): Effect.Effect<
		EngineInstance,
		never,
		Scope.Scope | PackageEngine.CtxTag
	> =>
		Effect.gen(function* () {
			const built = yield* PackageEngine.EngineImpl.pipe(
				Effect.provide(opts.layer),
			);

			const clientRpcs = opts.def.clientRpcs.toLayer(built.clientRpcs);
			const runtimeRpcs = opts.def.runtimeRpcs.toLayer(built.runtimeRpcs);
			const client = RpcServer.layer(opts.def.clientRpcs).pipe(
				Layer.provide(clientRpcs),
			);
			const runtime = RpcServer.layer(opts.def.runtimeRpcs).pipe(
				Layer.provide(runtimeRpcs),
			);

			yield* Effect.all(
				Record.map(built.resources, (ref) => ref.get),
				{ discard: true },
			);
			const resources = built.resources;

			const state = yield* LookupRef.make(built.clientState);

			return { client, runtime, state, resources };
		});
}
