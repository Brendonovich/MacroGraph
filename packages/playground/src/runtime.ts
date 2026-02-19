import { WebSdk } from "@effect/opentelemetry";
import { type Rpc, type RpcClient, RpcTest } from "@effect/rpc";
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
	EditorEventStream,
	GetPackageRpcClient,
	RuntimeEventStream,
} from "@macrograph/project-ui";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { createContext, useContext } from "solid-js";

import { BackendLive } from "./backend";
import { FrontendLive } from "./frontend";

const GetPackageRpcClientLive = Layer.effect(
	GetPackageRpcClient,
	Effect.gen(function* () {
		const engineRegistry = yield* EngineRegistry.EngineRegistry;
		const clients = new Map<string, RpcClient.RpcClient<Rpc.Any>>();

		return (id, rpcs) =>
			Effect.gen(function* () {
				const existing = clients.get(id);
				if (existing) return Option.some(existing as any);

				const engine = engineRegistry.engines.get(id);
				if (!engine) return Option.none();

				const client = yield* RpcTest.makeClient(rpcs).pipe(
					Effect.provide(engine.client),
				);

				clients.set(id, client as any);

				return Option.some(client);
			});
	}),
);

const EditorEventStreamLive = Layer.scoped(
	EditorEventStream,
	ProjectEditor.ProjectEditor.pipe(
		Effect.flatMap((r) => r.subscribe),
		Effect.map(Stream.filter((e) => e.actor.type === "SYSTEM")),
	),
);

const RuntimeEventStreamLive = Layer.scoped(
	RuntimeEventStream,
	ProjectRuntime.ProjectRuntime.pipe(
		Effect.flatMap((r) => r.subscribe),
		Effect.map(Stream.filter((e) => e.actor.type === "SYSTEM")),
	),
);

const TracingLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		if (!import.meta.env.DEV) return Layer.empty;

		const exporterConfig: OTLPExporterNodeConfigBase = {};
		const headers: Record<string, string> = {};

		exporterConfig.headers = headers;

		return WebSdk.layer(() => ({
			resource: { serviceName: "mg-playground" },
			// Export span data to the console
			spanProcessor: [
				new BatchSpanProcessor(new OTLPTraceExporter()),
				// new BatchSpanProcessor(new ConsoleSpanExporter()),
			],
		}));
	}),
);

export const RuntimeLayers = Layer.empty.pipe(
	Layer.provideMerge(FrontendLive),
	Layer.provideMerge(
		Layer.mergeAll(
			GetPackageRpcClientLive,
			EditorEventStreamLive,
			RuntimeEventStreamLive,
		),
	),
	Layer.provideMerge(BackendLive),
	Layer.provideMerge(Layer.scope),
	Layer.provide(Logger.pretty),
	Layer.provide(TracingLive),
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
