import { type Effect, Layer, type ManagedRuntime } from "effect";
import { createContext, useContext } from "solid-js";
import { WebSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

import { ClientAuth } from "./ClientAuth";
import { PackagesSettings } from "./Packages/PackagesSettings";
import { ProjectActions } from "./Project/Actions";
import { ProjectRealtime } from "./Project/Realtime";
import { ProjectRpc } from "./Project/Rpc";
import { ProjectState } from "./Project/State";
import { AuthActions } from "./Auth";
import { makeEffectQuery } from "./effect-query";

export namespace ProjectRuntime {
	const NodeSdkLive = WebSdk.layer(() => ({
		resource: { serviceName: "mg-server-frontend" },
		// Export span data to the console
		spanProcessor: [
			new BatchSpanProcessor(new OTLPTraceExporter()),
			// new BatchSpanProcessor(new ConsoleSpanExporter()),
		],
	}));

	export type ProjectRuntime = ManagedRuntime.ManagedRuntime<
		Context,
		Layer.Layer.Error<typeof ProjectRuntime.layer>
	>;

	export type Context =
		| Layer.Layer.Success<typeof ProjectRuntime.layer>
		| Layer.Layer.Context<typeof ProjectRuntime.layer>;

	export const layer = Layer.mergeAll(
		ProjectRealtime.Default,
		PackagesSettings.Default,
		ProjectActions.Default,
		ProjectState.Default,
		ProjectRpc.Default,
		AuthActions.Default,
		ClientAuth.Default,
	).pipe(Layer.provideMerge(NodeSdkLive), Layer.provideMerge(Layer.scope));
}

const ProjectRuntimeContext = createContext<ProjectRuntime.ProjectRuntime>();

export const ProjectRuntimeProvider = ProjectRuntimeContext.Provider;

export function useProjectRuntime() {
	const ctx = useContext(ProjectRuntimeContext);
	if (!ctx)
		throw new Error(
			"useProjectRuntime must be used within ProjectRuntimeProvider",
		);

	return ctx;
}

export function useProjectService<T>(
	service: Effect.Effect<
		T,
		never,
		ManagedRuntime.ManagedRuntime.Context<ProjectRuntime.ProjectRuntime>
	>,
) {
	const runtime = useProjectRuntime();

	return runtime.runSync(service);
}

export const { Provider, useEffectQuery, useEffectMutation } = makeEffectQuery(
	() => ProjectRuntime.layer,
);
