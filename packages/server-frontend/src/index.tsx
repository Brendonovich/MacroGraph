import { Effect, Layer, Match } from "effect";
import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	ContextualSidebarProvider,
	NavSidebarProvider,
	ProjectEffectRuntimeContext,
	ProjectState,
} from "@macrograph/project-ui";
import { makePersisted } from "@solid-primitives/storage";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { createStore } from "solid-js/store";
import { ErrorBoundary, render } from "solid-js/web";

import { ProjectRuntimeProvider, Provider, runtime } from "./EffectRuntime";
import { Layout } from "./Layout";
import {
	type PresenceClient,
	PresenceContextProvider,
} from "./Presence/Context";
import { ProjectRealtime } from "./Project/Realtime";
import { ProjectRpc } from "./Project/Rpc";
import { RealtimeContextProvider } from "./Realtime";
import App from "./routes";

import "@macrograph/project-ui/styles.css";

import { createLayoutState, LayoutStateProvider } from "./LayoutState";

export { runtime } from "./EffectRuntime";

export const UILive = Layer.scopedDiscard(
	Effect.gen(function* () {
		yield* Effect.log("Starting");

		const [presenceClients, setPresence] = createStore<
			Record<number, PresenceClient>
		>({});

		const realtime = yield* ProjectRealtime;
		const tagType = Match.discriminator("type");

		const { setState, actions } = yield* ProjectState;
		const rpc = yield* ProjectRpc.client;

		actions.setProject(yield* rpc.GetProject({}));

		// realtime.stream.pipe(
		// 	Stream.runForEach(
		// 		Effect.fn(function* (data) {
		// 			if (data.type === "identify")
		// 				throw new Error("Duplicate identify event");

		// 			const pkgSettings = yield* PackagesSettings;

		// 			yield* Match.value(data).pipe(
		// 				tagType("authChanged", ({ data }) =>
		// 					Effect.sync(() => {
		// 						setState("auth", data);
		// 					}),
		// 				),
		// 				tagType("packageStateChanged", (data) => {
		// 					return pkgSettings.getPackage(data.package).pipe(
		// 						Option.map((pkg) => pkg.notifySettingsChange),
		// 						Effect.transposeOption,
		// 					);
		// 				}),
		// 				tagType("connectedClientsChanged", ({ data }) =>
		// 					Effect.sync(() => {} /*setConnectedClients(data)*/),
		// 				),
		// 				tagType("PresenceUpdated", (data) =>
		// 					Effect.sync(() => {
		// 						setPresence(
		// 							reconcile(data.data as DeepWriteable<typeof data.data>),
		// 						);
		// 					}),
		// 				),
		// 				Match.exhaustive,
		// 			);
		// 		}),
		// 	),
		// 	runtime.runFork,
		// );

		const client = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		const layoutState = createLayoutState({
			wrapPaneLayoutStore: (s) =>
				makePersisted(s, { name: "editor-pane-layout" }),
			wrapPanesStore: (s) => makePersisted(s, { name: "editor-panes" }),
		});

		const dispose = render(
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
					<Provider runtime={runtime}>
						<ProjectEffectRuntimeContext.Provider value={runtime}>
							<EffectRuntimeProvider runtime={runtime}>
								<QueryClientProvider client={client}>
									<ProjectRuntimeProvider value={runtime}>
										<RealtimeContextProvider value={{ id: () => realtime.id }}>
											<PresenceContextProvider
												value={{ clients: presenceClients }}
											>
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
											</PresenceContextProvider>
										</RealtimeContextProvider>
									</ProjectRuntimeProvider>
								</QueryClientProvider>
							</EffectRuntimeProvider>
						</ProjectEffectRuntimeContext.Provider>
					</Provider>
				</ErrorBoundary>
			),
			document.getElementById("app")!,
		);

		return yield* Effect.never;

		return { dispose };
	}),
);
