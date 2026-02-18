import type { Rpc, RpcClient, RpcGroup } from "@effect/rpc";
import {
	Effect,
	Layer,
	Logger,
	type ManagedRuntime,
	Option,
	type Scope,
	Stream,
} from "effect";
import { ProjectEditor } from "@macrograph/project-editor";
import { EngineRegistry, ProjectRuntime } from "@macrograph/project-runtime";
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
		const engineRegistry = yield* EngineRegistry.EngineRegistry;
		const clients = new Map<string, RpcClient.RpcClient<Rpc.Any>>();

		return (id, _rpcs) =>
			Effect.sync(() => {
				const existing = clients.get(id);
				if (existing) return Option.some(existing as any);

				const engineClient = engineRegistry.engines.get(id)?.client;
				if (!engineClient) return Option.none();

				clients.set(id, engineClient as any);

				return Option.some(engineClient as any);
			});
	}),
);

const ProjectEventStreamLive = Layer.scoped(
	ProjectEventStream,
	Effect.zipWith(
		ProjectEditor.ProjectEditor.pipe(Effect.flatMap((r) => r.subscribe)),
		ProjectRuntime.ProjectRuntime.pipe(Effect.flatMap((r) => r.subscribe)),
		(editor, runtime) => Stream.merge(editor, runtime),
	).pipe(Effect.map(Stream.filter((e) => e.actor.type === "SYSTEM"))),
);

export const RuntimeLayers = Layer.empty.pipe(
	Layer.provideMerge(FrontendLive),
	Layer.provideMerge(
		Layer.mergeAll(GetPackageRpcClientLive, ProjectEventStreamLive),
	),
	Layer.provideMerge(BackendLive),
	Layer.provideMerge(Layer.scope),
	Layer.provide(Logger.pretty),
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
