import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import type { Graph, Package } from "@macrograph/project-domain/updated";
import {
	ContextualSidebar,
	CredentialsPage,
	credentialsQueryOptions,
	GraphContextMenu,
	GraphsSidebar,
	makeGraphTabSchema,
	makePackageTabSchema,
	PackageClients,
	PackagesSidebar,
	type PaneState,
	ProjectActions,
	ProjectEffectRuntimeContext,
	ProjectPaneLayoutView,
	ProjectPaneTabView,
	ProjectState,
	refetchCredentialsMutationOptions,
	SettingsLayout,
	Sidebar,
} from "@macrograph/project-ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { makePersisted } from "@solid-primitives/storage";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/solid-query";
import "@total-typescript/ts-reset";
import { Effect, ManagedRuntime, Option } from "effect";
import {
	createContextualSidebarState,
	createLayoutState,
	createSelectedSidebarState,
	LayoutStateProvider,
	useLayoutState,
} from "@macrograph/project-ui";
import {
	createResource,
	createSignal,
	Match,
	onMount,
	Show,
	Switch,
} from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import { PlaygroundRpc } from "./rpc";
import {
	EffectRuntimeContext,
	RuntimeLayers,
	useEffectRuntime,
	useService,
} from "./runtime";

import "@macrograph/project-ui/styles.css";
import { PaneLayoutView, TabLayout } from "@macrograph/ui";
import { createMousePosition } from "@solid-primitives/mouse";
import type { Accessor } from "solid-js";

export const effectRuntime = ManagedRuntime.make(RuntimeLayers);

namespace TabState {
	export type TabState =
		| {
				type: "graph";
				graphId: Graph.Id;
				selection: Graph.ItemRef[];
				transform?: { translate: { x: number; y: number }; zoom: number };
		  }
		| { type: "package"; packageId: Package.Id }
		| { type: "settings"; page: "Credentials" };

	export const isGraph = (
		self: TabState,
	): self is Extract<TabState, { type: "graph" }> => self.type === "graph";

	export const getKey = (state: TabState) => {
		switch (state.type) {
			case "graph":
				return `graph-${state.graphId}`;
			case "package":
				return `package-${state.packageId}`;
			case "settings":
				return "settings";
		}
	};
}

export default function NewPlayground() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	const [init] = createResource(async () => {
		await effectRuntime.runPromise(Effect.void);
		return true;
	});

	const layoutState = createLayoutState({
		wrapPaneLayoutStore: (s) =>
			makePersisted(s, { name: "editor-pane-layout" }),
		wrapPanesStore: (s) => makePersisted(s, { name: "editor-panes" }),
	});

	return (
		<div class="text-gray-12 font-sans w-screen h-screen overflow-hidden">
			<ProjectEffectRuntimeContext.Provider value={effectRuntime}>
				<EffectRuntimeProvider runtime={effectRuntime}>
					<EffectRuntimeContext.Provider value={effectRuntime}>
						<QueryClientProvider client={client}>
							<LayoutStateProvider {...layoutState}>
								<Show when={init()}>
									<Inner />
								</Show>
							</LayoutStateProvider>
						</QueryClientProvider>
					</EffectRuntimeContext.Provider>
				</EffectRuntimeProvider>
			</ProjectEffectRuntimeContext.Provider>
		</div>
	);
}

// this is very naughty of me but oh well

function Inner() {
	const actions = useService(ProjectActions);
	const { state, actions: stateActions } = useService(ProjectState);
	const rpc = useService(PlaygroundRpc);

	const initialize = useMutation(() => ({
		mutationFn: () =>
			Effect.gen(function* () {
				const project = yield* rpc.GetProject({});

				const packageClients = yield* PackageClients;
				const packageSettings = yield* Effect.promise(
					() => import("@macrograph/base-packages/Settings"),
				);

				for (const p of project.packages) {
					const getSettings = packageSettings.default[p.id];
					if (!getSettings) continue;
					yield* packageClients.registerPackageClient(
						p.id,
						yield* Effect.promise(getSettings),
					);
				}

				stateActions.setProject(project);
			}).pipe(runtime.runPromise),
		onError: (e) => {
			console.log(e);
		},
	}));

	onMount(() => {
		initialize.mutate();
	});

	const runtime = useEffectRuntime();

	const layoutState = useLayoutState();

	const selectedSidebar = createSelectedSidebarState(() => {
		const t = layoutState.focusedTab();
		if (t?.type === "graph") return "graphs";
		if (t?.type === "package") return "packages";
		return null;
	}, "graphs");

	const contextualSidebar = createContextualSidebarState({
		wrapOpenSignal: (s) =>
			makePersisted(s, {
				name: "contextual-sidebar",
			}),
	});

	createEventListener(window, "keydown", (e) => {
		if (e.code === "KeyB" && e.metaKey) {
			e.preventDefault();
			selectedSidebar.toggle();
		} else if (e.code === "KeyR" && e.metaKey) {
			e.preventDefault();
			contextualSidebar.setOpen((o) => !o);
		} else if (e.code === "Escape" && e.shiftKey) {
			layoutState.toggleZoomedPane(layoutState.focusedPaneId() ?? undefined);
		} else if (e.code === "ArrowLeft" && e.metaKey) {
			const pane = layoutState.focusedPaneId();
			if (pane === null) return;
			setPanes(
				pane,
				produce((p) => {
					const currentIndex = p.tabs.findIndex(
						(t) => t.tabId === p.selectedTab,
					);
					if (currentIndex === -1) return;
					const newId =
						p.tabs[currentIndex < 1 ? p.tabs.length - 1 : currentIndex - 1]
							?.tabId;
					if (newId === undefined) return;
					e.preventDefault();
					p.selectedTab = newId;
				}),
			);
		} else if (e.code === "ArrowRight" && e.metaKey) {
			const pane = layoutState.focusedPaneId();
			if (pane === null) return;
			setPanes(
				pane,
				produce((p) => {
					const currentIndex = p.tabs.findIndex(
						(t) => t.tabId === p.selectedTab,
					);
					if (currentIndex === -1) return;
					const newId =
						p.tabs[currentIndex < p.tabs.length - 1 ? currentIndex + 1 : 0]
							?.tabId;
					if (newId === undefined) return;
					e.preventDefault();
					p.selectedTab = newId;
				}),
			);
		} else if (e.code === "KeyW" && e.ctrlKey) {
			const pane = layoutState.focusedPane();
			if (pane === undefined) return;
			layoutState.removeTab(pane.id, pane.selectedTab);
			e.preventDefault();
		}
	});

	return (
		<div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-4">
			<div class="flex flex-row items-center h-9 z-10">
				<button
					type="button"
					onClick={() => {
						selectedSidebar.toggle("packages");
					}}
					data-selected={selectedSidebar.state() === "packages"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Packages
				</button>
				<button
					type="button"
					onClick={() => {
						selectedSidebar.toggle("graphs");
					}}
					data-selected={selectedSidebar.state() === "graphs"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Graphs
				</button>
				<div class="flex-1" />
				<button
					type="button"
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
					onClick={() => {
						layoutState.openTab({ type: "settings", page: "Credentials" });
					}}
				>
					Settings
				</button>
				{/*<AuthSection />*/}
			</div>
			<Show when={initialize.isSuccess}>
				<div class="flex flex-row flex-1 h-full relative">
					<div class="flex flex-row flex-1 divide-x divide-gray-5 h-full overflow-x-hidden">
						<Sidebar
							side="left"
							open={!!selectedSidebar.state()}
							onOpenChanged={(open) => {
								selectedSidebar.toggle(open);
							}}
						>
							<Switch>
								<Match when={selectedSidebar.state() === "graphs"}>
									<GraphsSidebar
										graphs={state.graphs}
										selected={(() => {
											const s = layoutState.focusedTab();
											if (s?.type === "graph") return s.graphId;
										})()}
										onSelected={(graph) => {
											layoutState.openTab({
												type: "graph",
												graphId: graph.id,
												selection: [],
											});
										}}
										onNewClicked={() => {
											actions.CreateGraph(rpc.CreateGraph);
										}}
									/>
								</Match>
								<Match when={selectedSidebar.state() === "packages"}>
									<PackagesSidebar
										packageId={(() => {
											const s = layoutState.focusedTab();
											if (s?.type === "package") return s.packageId;
										})()}
										onChange={(packageId) =>
											layoutState.openTab({ type: "package", packageId })
										}
									/>
								</Match>
							</Switch>
						</Sidebar>

						<ProjectPaneLayoutView
							makeTabController={(pane) =>
								usePaneTabController(pane, (setter) =>
									layoutState.updateTab(pane().id, pane().selectedTab, setter),
								)
							}
						/>

						<Sidebar
							side="right"
							open={contextualSidebar.open()}
							onOpenChanged={(open) => {
								contextualSidebar.setOpen(open);
							}}
						>
							<Show
								when={layoutState.zoomedPane() === null}
								fallback={<div class="flex-1 bg-gray-4" />}
							>
								<ContextualSidebar.Content
									state={contextualSidebar.state()}
									setNodeProperty={(r) =>
										actions.SetNodeProperty(
											rpc.SetNodeProperty,
											r.graph,
											r.node,
											r.property,
											r.value,
										)
									}
								/>
							</Show>
						</Sidebar>
					</div>

					<Show when={layoutState.panes[layoutState.zoomedPane() ?? -1]}>
						{(pane) => {
							createEventListener(window, "keydown", (e) => {
								if (e.key === "Escape") {
									layoutState.toggleZoomedPane();
								}
							});

							const tabController = usePaneTabController(pane, (setter) =>
								layoutState.updateTab(pane().id, pane().selectedTab, setter),
							);

							return (
								<div class="absolute inset-0 z-10 flex items-strech">
									<div class="m-2 divide-x divide-gray-5 flex flex-row flex-1 border border-gray-5 bg-gray-2 pointer-events-auto">
										<ProjectPaneTabView
											controller={tabController}
											pane={pane()}
										/>

										<Sidebar
											side="right"
											open={contextualSidebar.open()}
											onOpenChanged={(open) => {
												contextualSidebar.setOpen(open);
											}}
										>
											<ContextualSidebar.Content
												state={contextualSidebar.state()}
												setNodeProperty={(r) =>
													actions.SetNodeProperty(
														rpc.SetNodeProperty,
														r.graph,
														r.node,
														r.property,
														r.value,
													)
												}
											/>
										</Sidebar>
									</div>
								</div>
							);
						}}
					</Show>
				</div>
			</Show>
		</div>
	);
}

const usePaneTabController = (
	pane: Accessor<PaneState>,
	updateTab: (_: StoreSetter<TabState.TabState>) => void,
) => {
	const rpc = useService(PlaygroundRpc);

	const [_, setGraphCtxMenu] = GraphContextMenu.useContext();

	return TabLayout.defineController({
		get tabs() {
			const packageClients = useService(PackageClients);
			const { state } = useService(ProjectState);

			return pane()
				.tabs.map((tab) => {
					if (tab.type === "graph") {
						const graph = state.graphs[tab.graphId];
						if (!graph) return false;
						return { ...tab, graph };
					}
					if (tab.type === "settings") return tab;
					if (tab.type === "package") {
						const pkg = state.packages[tab.packageId];
						if (!pkg) return false;
						return packageClients.getPackage(tab.packageId).pipe(
							Option.map((client) => ({
								...tab,
								client,
								package: pkg,
							})),
							Option.getOrUndefined,
						);
					}
					return false;
				})
				.filter(Boolean);
		},
		get selectedTab() {
			return pane().selectedTab;
		},
		schema: {
			graph: makeGraphTabSchema(
				(setter) => {
					return updateTab((v) => {
						if (v.type !== "graph") return v;
						if (typeof setter === "function") return setter(v, []);
						return setter;
					});
				},
				rpc,
				(state) => {
					if (state.open) setGraphCtxMenu({ ...state, paneId: pane().id });
					else setGraphCtxMenu(state);
				},
			),
			settings: {
				getMeta: (tab) => ({
					title: "Settings",
					desc: tab.page,
				}),
				Component: (tab) => (
					<SettingsLayout
						pages={[
							{
								name: "Credentials",
								page: "Credentials" as const,
								Component() {
									const runtime = useEffectRuntime();

									const credentials = useQuery(() =>
										credentialsQueryOptions(() =>
											rpc.GetCredentials().pipe(runtime.runPromise),
										),
									);
									const refetchCredentials = useMutation(() =>
										refetchCredentialsMutationOptions(() =>
											rpc.RefetchCredentials().pipe(runtime.runPromise),
										),
									);

									return (
										<CredentialsPage
											description="The credentials connected to your MacroGraph account."
											credentials={credentials}
											onRefetch={() =>
												refetchCredentials
													.mutateAsync()
													.then(() => credentials.refetch())
											}
										/>
									);
								},
							},
						]}
						page={tab().page}
						onChange={(page) => {
							updateTab(
								produce((t) => {
									if (t.type === "settings") {
										t.page = page;
									}
								}),
							);
						}}
					/>
				),
			},
			package: makePackageTabSchema(rpc.GetPackageSettings),
		},
	});
};

// import {
//   Atom,
//   Registry,
//   useAtomResource,
//   useAtomSet,
// } from "@effect-atom/atom-solid";
// import { BackendLayers } from "./backend";

// const atomRuntime = Atom.runtime(
//   PlaygroundRpc.Default.pipe(
//     Layer.provide(BackendLayers),
//     Layer.provide(Layer.scope),
//   ),
// );

// const credentialsAtom = atomRuntime.atom(
//   Effect.flatMap(PlaygroundRpc, (rpc) => rpc.GetCredentials()).pipe(
//     Effect.zipLeft(Effect.sleep("1 seconds")),
//   ),
// );

// const refetchCredentialsAtom = atomRuntime.fn(
//   Effect.fn(function* () {
//     const rpc = yield* PlaygroundRpc;
//     const atomRegistry = yield* Registry.AtomRegistry;

//     yield* Effect.sleep("1 seconds");
//     yield* rpc.RefreshCredentials();
//     atomRegistry.refresh(credentialsAtom);
//   }),
// );
