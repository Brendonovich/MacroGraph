import { Effect, Layer } from "effect";
import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	ContextualSidebarProvider,
	NavSidebarProvider,
	ProjectEffectRuntimeContext,
	ProjectState,
} from "@macrograph/project-ui";
import { makePersisted } from "@solid-primitives/storage";
import { QueryClientProvider } from "@tanstack/solid-query";
import { ErrorBoundary, render } from "solid-js/web";

import { ProjectRuntimeProvider, runtime } from "./EffectRuntime";
import { Layout } from "./Layout";
import { ProjectRealtime } from "./Project/Realtime";
import { RealtimeContextProvider } from "./Realtime";
import App from "./routes";
import { ServerRpc } from "./ServerRpc";

import "@macrograph/project-ui/styles.css";

import { createLayoutState, LayoutStateProvider } from "./LayoutState";
import { TSQueryClient } from "./QueryInvalidation";

export { runtime } from "./EffectRuntime";

export const UILive = Layer.scopedDiscard(
	Effect.gen(function* () {
		yield* Effect.log("Starting");

		const realtime = yield* ProjectRealtime;

		const { actions } = yield* ProjectState;
		const rpc = yield* ServerRpc.client;

		actions.setProject(yield* rpc.GetProject({}));

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
														makePersisted(s, {
															name: "contextual-sidebar",
														})
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
