import { Effect, Layer, type ManagedRuntime, Option, Stream } from "effect";
import {
	ProjectEventStream,
	ProjectRequestHandler,
	ProjectUILayers,
} from "@macrograph/project-ui";
import type { ServerEvent } from "@macrograph/server-domain";
import { createContext, useContext } from "solid-js";

import { AuthActions } from "./Auth";
import { ConnectedClientsState } from "./ConnectedClientsState";
import { HttpPackgeRpcClient } from "./Packages/PackagesSettings";
import { PresenceClients } from "./Presence/PresenceClients";
import { ProjectRealtime } from "./Project/Realtime";
import { QueryInvalidation, TSQueryClient } from "./QueryInvalidation";
import {
	ServerEventStream,
	ServerEventStreamHandlerLive,
} from "./ServerEventHandler";
import { ServerRegistration } from "./ServerRegistration";
import { ServerRpc } from "./ServerRpc";

const ProjectEventStreamLive = Layer.effect(
	ProjectEventStream,
	Effect.gen(function* () {
		const realtime = yield* ProjectRealtime;

		return realtime.stream().pipe(
			Stream.filterMap((e) => {
				if (!("_tag" in e)) return Option.none();
				// Filter for ProjectEvent tags (not ServerEvent tags)
				const serverEventTags = [
					"AuthChanged",
					"ConnectedClientsChanged",
					"PresenceUpdated",
				];
				if (serverEventTags.includes(e._tag)) return Option.none();
				return Option.some(e as any);
			}),
			Stream.orDie,
		);
	}),
);

const ServerEventStreamLive = Layer.effect(
	ServerEventStream,
	Effect.gen(function* () {
		const realtime = yield* ProjectRealtime;

		return realtime.stream().pipe(
			Stream.filterMap((e) => {
				// Filter for ServerEvent tags only
				if (!("_tag" in e)) return Option.none();
				const serverEventTags = [
					"AuthChanged",
					"ConnectedClientsChanged",
					"PresenceUpdated",
				];
				if (serverEventTags.includes(e._tag)) {
					return Option.some(e as ServerEvent.ServerEvent);
				}
				return Option.none();
			}),
			Stream.orDie,
		);
	}),
);

const RequestHandlersLive = Layer.effect(
	ProjectRequestHandler,
	ServerRpc.client,
);

const FrontendLive = ServerEventStreamHandlerLive.pipe(
	Layer.provideMerge(
		Layer.mergeAll(
			ProjectUILayers,
			AuthActions.Default,
			ConnectedClientsState.Default,
			ServerRegistration.Default,
			PresenceClients.Default,
			QueryInvalidation.Default,
			TSQueryClient.Default,
		),
	),
	Layer.provideMerge(
		Layer.mergeAll(
			HttpPackgeRpcClient,
			ProjectEventStreamLive,
			ServerEventStreamLive,
			RequestHandlersLive,
		),
	),
	Layer.provideMerge(
		Layer.mergeAll(ServerRpc.Default, ProjectRealtime.Default),
	),
);

export namespace EffectRuntime {
	export type EffectRuntime = ManagedRuntime.ManagedRuntime<Context, any>;

	export type Context =
		| Layer.Layer.Success<typeof EffectRuntime.layer>
		| Layer.Layer.Context<typeof EffectRuntime.layer>;

	export const layer = FrontendLive.pipe(Layer.provideMerge(Layer.scope));
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
