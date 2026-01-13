import { type Rpc, type RpcClient, RpcTest } from "@effect/rpc";
import {
	Effect,
	Layer,
	type ManagedRuntime,
	Option,
	type Scope,
	Stream,
} from "effect";
import { ProjectEditor } from "@macrograph/project-editor";
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
		const runtime = yield* ProjectRuntime.ProjectRuntime_;
		const clients = new Map<string, RpcClient.RpcClient<Rpc.Any>>();

		return (id) =>
			Effect.gen(function* () {
				if (clients.get(id)) return clients.get(id)! as any;

				const pkg = yield* runtime.package(id);

				const data = pkg.pipe(
					Option.flatMap((o) => Option.fromNullable(o.engine?.clientRpcs)),
					Option.zipWith(
						Option.fromNullable(runtime.engines.get(id)?.clientRpcs),
						(a, b) => [a, b] as const,
					),
				);
				if (Option.isNone(data)) return Option.none();

				const [rpcs, layer] = data.value;

				const client = yield* RpcTest.makeClient(rpcs).pipe(
					Effect.provide(layer),
				);

				clients.set(id, client as any);

				return Option.some(client);
			});
	}),
);

const ProjectEventStreamLive = Layer.scoped(
	ProjectEventStream,
	Effect.zipWith(
		ProjectEditor.ProjectEditor.pipe(Effect.flatMap((r) => r.subscribe)),
		ProjectRuntime.ProjectRuntime_.pipe(Effect.flatMap((r) => r.subscribe)),
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
