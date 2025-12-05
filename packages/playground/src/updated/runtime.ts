import { type Rpc, type RpcClient, RpcTest } from "@effect/rpc";
import {
	Effect,
	Layer,
	type ManagedRuntime,
	Option,
	type Scope,
	Stream,
} from "effect";
import { ProjectRuntime } from "@macrograph/project-runtime";
import {
	GetPackageRpcClient,
	ProjectEventStream,
} from "@macrograph/project-ui";
import { createContext, useContext } from "solid-js";

import { BackendLive } from "./backend";
import { FrontendLive } from "./frontend";

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
			});
	}),
);

const ProjectEventStreamLive = Layer.effect(
	ProjectEventStream,
	Effect.map(ProjectRuntime.Current, (r) => Stream.fromPubSub(r.events)),
);

export const RuntimeLayers = Layer.empty.pipe(
	Layer.provideMerge(FrontendLive),
	Layer.provideMerge(
		Layer.mergeAll(GetPackageRpcClientLive, ProjectEventStreamLive),
	),
	Layer.provideMerge(BackendLive),
	Layer.provideMerge(Layer.scope),
) satisfies Layer.Layer<any, any, Scope.Scope>;

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
