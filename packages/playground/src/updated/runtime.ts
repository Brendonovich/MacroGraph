import { type Rpc, type RpcClient, type RpcGroup, RpcTest } from "@effect/rpc";
import { Effect, Layer, type ManagedRuntime, Option, Stream } from "effect";
import { ProjectRuntime } from "@macrograph/project-runtime";
import { GetPackageRpcClient, PackageClients } from "@macrograph/project-ui";
import { createContext, useContext } from "solid-js";

import { BackendLayers } from "./backend";
import { FrontendLayers } from "./frontend";

const StreamHandler = Layer.scopedDiscard(
	Effect.gen(function* () {
		const { events } = yield* ProjectRuntime.Current;
		const pkgClients = yield* PackageClients;

		yield* Stream.fromPubSub(events).pipe(
			Stream.runForEach((e) =>
				Effect.gen(function* () {
					if (e._tag === "PackageStateChanged") {
						yield* pkgClients.getPackage(e.pkg).pipe(
							Effect.flatMap((p) => p.notifySettingsChange),
							Effect.catchAll(() => Effect.void),
						);
					}
				}),
			),
			Effect.forkScoped,
		);
	}),
);

const GetPackageRpcClientLive = Layer.effect(
	GetPackageRpcClient,
	Effect.gen(function* () {
		const runtime = yield* ProjectRuntime.Current;
		const clients = new Map<string, RpcClient.RpcClient<Rpc.Any>>();

		return (id) =>
			Effect.gen(function* () {
				if (clients.get(id)) return clients.get(id)! as any;

				return runtime.packages.get(id)?.engine.pipe(
					Effect.flatMap(
						Effect.fn(function* (e) {
							const [rpcs, layer] = yield* Option.fromNullable(e.def.rpc).pipe(
								Option.zipWith(
									Option.fromNullable(e.rpc),
									(a, b) => [a, b] as const,
								),
							);

							const client = yield* RpcTest.makeClient(rpcs).pipe(
								Effect.provide(layer),
							);

							clients.set(id, client);

							return client;
						}),
					),
				);
				// const pkg = runtime.packages.get(id)?.rpc ?? Option.none();

				// if (Option.isNone(pkg)) throw new Error("Package not found");

				// const client = yield* RpcTest.makeClient(
				// 	rpcs as unknown as RpcGroup.RpcGroup<Rpc.Any>,
				// ).pipe(Effect.provide(pkg.value.layer));

				// clients.set(id, client);

				// return client as any;
			});
	}),
);

export const RuntimeLayers = Layer.empty.pipe(
	Layer.merge(StreamHandler),
	Layer.provideMerge(FrontendLayers),
	Layer.provideMerge(GetPackageRpcClientLive),
	Layer.provideMerge(BackendLayers),
);

export type EffectRuntime = ManagedRuntime.ManagedRuntime<
	Layer.Layer.Success<typeof RuntimeLayers>,
	Layer.Layer.Error<typeof RuntimeLayers>
>;

export const EffectRuntimeContext = createContext<EffectRuntime>();

export function useEffectRuntime() {
	const ctx = useContext(EffectRuntimeContext);
	if (!ctx)
		throw new Error(
			"useEffectRuntime must be used within EffectRuntimeContext.Provider",
		);

	return ctx;
}

export function useService<T>(
	service: Effect.Effect<
		T,
		never,
		ManagedRuntime.ManagedRuntime.Context<EffectRuntime>
	>,
) {
	const runtime = useEffectRuntime();

	return runtime.runSync(service);
}
