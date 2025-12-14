import { WebSdk } from "@effect/opentelemetry";
import { Effect, Layer, ManagedRuntime, Option, Stream } from "effect";
import {
	ProjectEventStream,
	ProjectRequestHandler,
	ProjectUILayers,
} from "@macrograph/project-ui";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { createEffectQueryFromManagedRuntime } from "effect-query";
import { createContext, useContext } from "solid-js";

import { AuthActions } from "./Auth";
import { makeEffectQuery } from "./effect-query";
import { HttpPackgeRpcClient } from "./Packages/PackagesSettings";
import { ProjectRealtime } from "./Project/Realtime";
import { ProjectRpc } from "./Project/Rpc";

const ProjectEventStreamLive = Layer.effect(
	ProjectEventStream,
	Effect.gen(function* () {
		const realtime = yield* ProjectRealtime;

		return realtime.stream.pipe(
			Stream.filterMap((e) => ("_tag" in e ? Option.some(e) : Option.none())),
			Stream.orDie,
		);
	}),
);

const RequestHandlersLive = Layer.effect(
	ProjectRequestHandler,
	ProjectRpc.client,
);

const FrontendLive = Layer.empty.pipe(
	Layer.provideMerge(Layer.mergeAll(ProjectUILayers, AuthActions.Default)),
	Layer.provideMerge(
		Layer.mergeAll(
			HttpPackgeRpcClient,
			ProjectEventStreamLive,
			RequestHandlersLive,
		),
	),
	Layer.provideMerge(
		Layer.mergeAll(ProjectRpc.Default, ProjectRealtime.Default),
	),
);

export namespace EffectRuntime {
	const NodeSdkLive = WebSdk.layer(() => ({
		resource: { serviceName: "mg-server-frontend" },
		// Export span data to the console
		spanProcessor: [
			new BatchSpanProcessor(new OTLPTraceExporter()),
			// new BatchSpanProcessor(new ConsoleSpanExporter()),
		],
	}));

	export type EffectRuntime = ManagedRuntime.ManagedRuntime<
		Context,
		Layer.Layer.Error<typeof EffectRuntime.layer>
	>;

	export type Context =
		| Layer.Layer.Success<typeof EffectRuntime.layer>
		| Layer.Layer.Context<typeof EffectRuntime.layer>;

	export const layer = Layer.mergeAll(FrontendLive, NodeSdkLive).pipe(
		Layer.provideMerge(Layer.scope),
	);
}

const EffectRuntimeContext = createContext<EffectRuntime.EffectRuntime>();

export const ProjectRuntimeProvider = EffectRuntimeContext.Provider;

export function useEffectRuntime() {
	const ctx = useContext(EffectRuntimeContext);
	if (!ctx)
		throw new Error(
			"useProjectRuntime must be used within EffectRuntimeProvider",
		);

	return ctx;
}

export function useEffectService<T>(
	service: Effect.Effect<
		T,
		never,
		ManagedRuntime.ManagedRuntime.Context<EffectRuntime.EffectRuntime>
	>,
) {
	const runtime = useEffectRuntime();

	return runtime.runSync(service);
}

export const { Provider, useEffectQuery, useEffectMutation } = makeEffectQuery(
	() => EffectRuntime.layer,
);

export const runtime = ManagedRuntime.make(EffectRuntime.layer);
export const eq = createEffectQueryFromManagedRuntime(runtime);
