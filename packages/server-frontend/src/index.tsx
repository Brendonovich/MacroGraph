import { Effect, Layer, Schedule, Stream } from "effect";
import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	ContextualSidebarProvider,
	EditorState,
	NavSidebarProvider,
	ProjectEffectRuntimeContext,
} from "@macrograph/project-ui";
import { makePersisted } from "@solid-primitives/storage";
import { QueryClientProvider } from "@tanstack/solid-query";
import { ErrorBoundary, render } from "solid-js/web";

import { type EffectRuntime, ProjectRuntimeProvider } from "./EffectRuntime";
import { Layout } from "./Layout";
import { ProjectRealtime } from "./Project/Realtime";
import { RealtimeContextProvider } from "./Realtime";
import App from "./routes";
import { ServerRpc } from "./ServerRpc";

import "@macrograph/project-ui/styles.css";

import { createLayoutState, LayoutStateProvider } from "./LayoutState";
import { TSQueryClient } from "./QueryInvalidation";

export { EffectRuntime } from "./EffectRuntime";

export const UILive = (runtime: EffectRuntime.EffectRuntime) =>
	Layer.scopedDiscard(
		Effect.gen(function* () {
			const realtime = yield* ProjectRealtime;

			const { actions } = yield* EditorState;
			const rpc = yield* ServerRpc.client;

			actions.setProject(
				yield* rpc
					.GetProject({})
					.pipe(
						Effect.tapDefect(() => Effect.logError("Failed to get project")),
					),
			);

			// On reconnection, re-fetch the full project state to ensure consistency.
			// We add a small delay to allow the RPC client to reconnect with the
			// new token before making requests. If it still fails, retry.
			yield* realtime.reconnected().pipe(
				Stream.runForEach(() =>
					Effect.gen(function* () {
						yield* Effect.log("Reconnected — re-fetching project state");

						const data = yield* rpc.GetProject({}).pipe(
							Effect.retry({ times: 3, schedule: Schedule.spaced("1 second") }),
							Effect.tapError(() =>
								Effect.logError(
									"Failed to re-fetch project after reconnection",
								),
							),
						);

						console.log("Refetched data", data);

						actions.setProject(data);
						yield* Effect.log("Project state refreshed after reconnection");
					}).pipe(
						Effect.catchAllCause((cause) =>
							Effect.logError("Reconnection state refresh failed", cause),
						),
					),
				),
				Effect.forkScoped,
			);

			const layoutState = createLayoutState({
				wrapPaneLayoutStore: (s) =>
					makePersisted(s, { name: "editor-pane-layout" }),
				wrapPanesStore: (s) => makePersisted(s, { name: "editor-panes" }),
			});

			const queryClient = yield* TSQueryClient;

			render(
				() => (
					<ErrorBoundary
						fallback={(e) => {
							console.error(e);
							return (
								<div>
									{e.toString()}
									<pre>{e.stack}</pre>
								</div>
							);
						}}
					>
						<ProjectEffectRuntimeContext.Provider value={runtime}>
							<EffectRuntimeProvider runtime={runtime}>
								<QueryClientProvider client={queryClient}>
									<ProjectRuntimeProvider value={runtime}>
										<RealtimeContextProvider value={{ id: () => realtime.id }}>
											<LayoutStateProvider {...layoutState}>
												<NavSidebarProvider>
													<ContextualSidebarProvider
														wrapOpenSignal={(s) =>
															makePersisted(s, { name: "contextual-sidebar" })
														}
													>
														<Layout>
															<App />
														</Layout>
													</ContextualSidebarProvider>
												</NavSidebarProvider>
											</LayoutStateProvider>
										</RealtimeContextProvider>
									</ProjectRuntimeProvider>
								</QueryClientProvider>
							</EffectRuntimeProvider>
						</ProjectEffectRuntimeContext.Provider>
					</ErrorBoundary>
				),
				document.getElementById("app")!,
			);

			return yield* Effect.never;
		}),
	);
