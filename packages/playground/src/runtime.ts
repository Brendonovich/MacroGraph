import { Effect, Layer, ManagedRuntime } from "effect";
import { createContext, useContext } from "solid-js";
import { BackendLayers } from "./backend";
import { FrontendLayers } from "./frontend";
import { GetPackageRpcProtocol } from "@macrograph/project-frontend";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { FetchHttpClient } from "@effect/platform"

export const RuntimeLayers = Layer.provideMerge(FrontendLayers, BackendLayers).pipe(
	Layer.provideMerge(Layer.succeed(GetPackageRpcProtocol,
		id => RpcClient.layerProtocolHttp({ url: `/api/package/${id}/rpc` }).pipe(
			Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
		)
	)),
	Layer.provideMerge(Layer.scope)
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
