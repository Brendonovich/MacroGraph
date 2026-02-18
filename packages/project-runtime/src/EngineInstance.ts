import { FetchHttpClient } from "@effect/platform";
import {
	type Rpc,
	RpcClient,
	RpcSerialization,
	RpcServer,
	RpcTest,
} from "@effect/rpc";
import { Effect, Layer, Record, type Scope } from "effect";
import { PackageEngine, type Resource } from "@macrograph/package-sdk";
import {
	NodesIOStore,
	type Package,
	type Project,
	ProjectEvent,
	SubscribableCache,
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
	readonly state: SubscribableCache.SubscribableCache<unknown, never>;
	readonly resources: Record<
		string,
		SubscribableCache.SubscribableCache<ReadonlyArray<any>, never>
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
				credentials: credentials.get.pipe(Effect.orDie),
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

			const refreshResources: Effect.Effect<void> = Effect.all(
				Record.map(instance.resources, (cache, key) =>
					cache.refresh.pipe(
						Effect.tap((values) =>
							runtime.publishEvent(
								new ProjectEvent.PackageResourcesUpdated({
									package: args.pkgId,
									resources: { [key]: values },
								}),
							),
						),
						Effect.asVoid,
					),
				),
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
		readonly state: SubscribableCache.SubscribableCache<unknown, never>;
		readonly resources: Record<
			string,
			SubscribableCache.SubscribableCache<Array<Resource.Value>, never>
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

			const resources = yield* Effect.all(
				Record.map(built.resources, (get) =>
					SubscribableCache.make({
						capacity: 1,
						timeToLive: "1 minute",
						lookup: get,
					}).pipe(Effect.tap((c) => c.get)),
				),
			);

			const state = yield* SubscribableCache.make({
				capacity: 1,
				lookup: built.clientState,
				timeToLive: "1 minute",
			});

			return { client, runtime, state, resources };
		});
}
