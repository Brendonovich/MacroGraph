import { FetchHttpClient, FileSystem, KeyValueStore } from "@effect/platform";
import {
	type Rpc,
	RpcClient,
	type RpcGroup,
	RpcSerialization,
	type RpcServer,
	RpcTest,
} from "@effect/rpc";
import {
	Array,
	Context,
	Effect,
	Layer,
	Option,
	pipe,
	Queue,
	Record,
	Schema as S,
	type Scope,
	Stream,
} from "effect";
import { PackageEngine, type Resource } from "@macrograph/package-sdk";
import {
	LookupRef,
	type NodesIOStore,
	type Package,
	type Project,
	ProjectEvent,
} from "@macrograph/project-domain";

import { CloudApiClient } from "./CloudApi";
import { CredentialsStore } from "./CredentialsStore";
import type { EngineRegistry } from "./EngineRegistry";
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

export class EnginePersistence extends Context.Tag("EnginePersistence")<
	EnginePersistence,
	{
		read: (pkgId: Package.Id) => Effect.Effect<Option.Option<string>>;
		write: (pkgId: Package.Id, data: string) => Effect.Effect<void>;
	}
>() {
	static layerKeyValue = Layer.effect(
		EnginePersistence,
		Effect.gen(function* () {
			const kv = yield* KeyValueStore.KeyValueStore;

			return {
				read: (pkgId) => kv.get(`engine-state:${pkgId}`).pipe(Effect.orDie),
				write: (pkgId, data) =>
					kv.set(`engine-state:${pkgId}`, data).pipe(Effect.orDie),
			};
		}),
	);

	static layerFileSystem = (directory: string) =>
		Layer.effect(
			EnginePersistence,
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;

				if (!(yield* fs.exists(directory)))
					yield* fs.makeDirectory(directory, { recursive: true });

				return {
					read: (pkgId) =>
						fs.readFileString(`${directory}/${pkgId}.json`).pipe(Effect.option),
					write: (pkgId, data) =>
						fs
							.writeFileString(`${directory}/${pkgId}.json`, data)
							.pipe(Effect.ignore),
				};
			}),
		);
}

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
		| EnginePersistence
	> =>
		Effect.gen(function* () {
			const credentials = yield* CredentialsStore;
			const cloud = yield* CloudApiClient.CloudApiClient;
			const runtime = yield* ProjectRuntime.ProjectRuntime;
			const persistence = yield* EnginePersistence;

			const credentialsRef = LookupRef.mapGet(credentials, (get) =>
				get.pipe(Effect.catchAll(() => Effect.succeed([]))),
			);

			const events = yield* Queue.unbounded<PackageEngine.AnyEvent>();

			yield* events.pipe(
				Stream.fromQueue,
				Stream.runForEach((e) =>
					Effect.gen(function* () {
						yield* ProjectRuntime.handleEvent(args.pkgId, e).pipe(
							Effect.provideService(
								ProjectRuntime.CurrentProject,
								yield* args.getProject,
							),
						);
					}).pipe(Effect.forkDaemon),
				),
				Effect.forkScoped,
			);

			let refreshState: Effect.Effect<void> = Effect.void;
			let refreshResources: Effect.Effect<void> = Effect.void;

			const ctxLayer = Layer.succeed(PackageEngine.CtxTag, {
				emitEvent: (e) => events.unsafeOffer(e),
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
				saveState: (state) =>
					Effect.gen(function* () {
						const serialize = S.encode(args.engine.engineState);

						yield* persistence.write(
							args.pkgId,
							JSON.stringify(yield* serialize(state).pipe(Effect.orDie)),
						);
					}),
				initialState: yield* Effect.gen(function* () {
					if (!args.engine.engineState) return;
					const saved = yield* persistence
						.read(args.pkgId)
						.pipe(Effect.map(Option.getOrNull));
					if (!saved) return;

					const deserialize = S.decode(S.parseJson(args.engine.engineState));
					return yield* deserialize(saved).pipe(
						Effect.catchAll(() => Effect.void),
					);
				}),
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

			refreshResources = Effect.all(
				Record.map(instance.resources, (cache) => cache.refresh),
			).pipe(Effect.asVoid);
			refreshState = instance.state.refresh;

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
		readonly def: PackageEngine.Any;
		readonly client: Layer.Layer<Rpc.Handler<string>, never, never>;
		readonly runtime: RpcClient.RpcClient<Rpc.Any>; //  Layer.Layer<Rpc.Handler<string>, never, never>;
		readonly state: LookupRef.LookupRef<unknown, never>;
		readonly resources: Record<
			string,
			LookupRef.LookupRef<Array<Resource.Value>, never>
		>;
	}

	export const make = ({
		def,
		layer,
	}: {
		def: PackageEngine.PackageEngine<
			any,
			any,
			PackageEngine.AnyEvent,
			S.Schema.Any,
			Resource.Tag<any, any>,
			S.Schema.AnyNoContext
		>;
		layer: EngineImplementationLayer;
	}): Effect.Effect<
		EngineInstance,
		never,
		Scope.Scope | PackageEngine.CtxTag
	> =>
		Effect.gen(function* () {
			const built = yield* PackageEngine.EngineImpl.pipe(Effect.provide(layer));

			const client = def.clientRpcs.toLayer(built.clientRpcs);

			const runtime = yield* RpcTest.makeClient(
				def.runtimeRpcs as RpcGroup.RpcGroup<Rpc.Any>,
			).pipe(Effect.provide(def.runtimeRpcs.toLayer(built.runtimeRpcs)));

			yield* Effect.all(
				Record.map(built.resources, (ref) => ref.get),
				{ discard: true },
			);
			const resources = built.resources;

			const state = yield* LookupRef.make(built.clientState);

			return { def, client, runtime, state, resources };
		});
}
