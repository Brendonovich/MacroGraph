import { Effect, Layer, Match } from "effect";
import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	createLayoutState,
	LayoutStateProvider,
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
		// 				tagType("packageAdded", ({ data }) =>
		// 					Effect.sync(() => {
		// 						if (packages[data.package]) return;
		// 						setPackages(data.package, { id: data.package });
		// 					}),
		// 				),
		// 				tagType("NodeMoved", (data) =>
		// 					Effect.sync(() => {
		// 						setState(
		// 							produce((prev) => {
		// 								const node = prev.graphs[data.graphId]?.nodes.find(
		// 									(n) => n.id === data.nodeId,
		// 								);

		// 								if (node) node.position = data.position;
		// 							}),
		// 						);
		// 					}),
		// 				),
		// 				tagType("NodesMoved", (data) =>
		// 					Effect.sync(() => {
		// 						setState(
		// 							produce((prev) => {
		// 								const graph = prev.graphs[data.graphId];
		// 								if (!graph) return;

		// 								for (const [nodeId, position] of data.positions) {
		// 									const node = graph.nodes.find((n) => n.id === nodeId);
		// 									if (node) node.position = position;
		// 								}
		// 							}),
		// 						);
		// 					}),
		// 				),
		// 				tagType("NodeCreated", (data) =>
		// 					Effect.sync(() => {
		// 						setState(
		// 							produce((prev) => {
		// 								const nodes = prev.graphs[data.graphId]?.nodes;
		// 								if (!nodes) return;

		// 								nodes.push({
		// 									name: data.name,
		// 									id: data.nodeId,
		// 									inputs: data.inputs as DeepWriteable<typeof data.inputs>,
		// 									outputs: data.outputs as DeepWriteable<
		// 										typeof data.outputs
		// 									>,
		// 									position: data.position,
		// 									schema: data.schema,
		// 								});
		// 							}),
		// 						);
		// 					}),
		// 				),
		// 				tagType("IOConnected", (data) =>
		// 					Effect.sync(() => {
		// 						setState(
		// 							produce((prev) => {
		// 								const graph = prev.graphs[data.graphId];
		// 								if (!graph) return;

		// 								const outNodeConnections = (graph.connections[
		// 									data.output.nodeId
		// 								] ??= {});
		// 								const outConnections = ((outNodeConnections.out ??= {})[
		// 									data.output.ioId
		// 								] ??= []);
		// 								outConnections.push([data.input.nodeId, data.input.ioId]);

		// 								const inNodeConnections = (graph.connections[
		// 									data.input.nodeId
		// 								] ??= {});
		// 								const inConnections = ((inNodeConnections.in ??= {})[
		// 									data.input.ioId
		// 								] ??= []);
		// 								inConnections.push([data.output.nodeId, data.output.ioId]);
		// 							}),
		// 						);
		// 					}),
		// 				),
		// 				tagType("IODisconnected", (data) =>
		// 					Effect.sync(() => {
		// 						// tbh probably gonna need to serialize everything that got disconnected

		// 						setState(
		// 							produce((prev) => {
		// 								actions.disconnectIO(prev, {
		// 									graphId: data.graphId,
		// 									nodeId: data.io.nodeId,
		// 									ioId: data.io.ioId,
		// 									type: data.io.type,
		// 								});
		// 							}),
		// 						);
		// 					}),
		// 				),
		// 				tagType("PresenceUpdated", (data) =>
		// 					Effect.sync(() => {
		// 						setPresence(
		// 							reconcile(data.data as DeepWriteable<typeof data.data>),
		// 						);
		// 					}),
		// 				),
		// 				tagType("SelectionDeleted", (data) =>
		// 					Effect.sync(() => {
		// 						setState(
		// 							produce((prev) => {
		// 								const graph = prev.graphs[data.graphId];
		// 								if (!graph) return;

		// 								for (const nodeId of data.selection) {
		// 									actions.deleteNode(prev, {
		// 										graphId: data.graphId,
		// 										nodeId,
		// 									});
		// 								}
		// 							}),
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
				<Provider runtime={runtime}>
					<ProjectEffectRuntimeContext.Provider value={runtime}>
						<EffectRuntimeProvider runtime={runtime}>
							<QueryClientProvider client={client}>
								<ProjectRuntimeProvider value={runtime}>
									<RealtimeContextProvider value={{ id: () => realtime.id }}>
										<PresenceContextProvider
											value={{ clients: presenceClients }}
										>
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
												<LayoutStateProvider {...layoutState}>
													<Layout>
														<App />
													</Layout>
												</LayoutStateProvider>
											</ErrorBoundary>
										</PresenceContextProvider>
									</RealtimeContextProvider>
								</ProjectRuntimeProvider>
							</QueryClientProvider>
						</EffectRuntimeProvider>
					</ProjectEffectRuntimeContext.Provider>
				</Provider>
			),
			document.getElementById("app")!,
		);

		return yield* Effect.never;

		return { dispose };
	}),
);
