import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	type Graph,
	type Node,
	Package,
} from "@macrograph/project-domain/updated";
import {
	ContextualSidebar,
	CredentialsPage,
	createGraphContext,
	EditorTabs,
	GraphContext,
	GraphContextMenu,
	GraphsSidebar,
	GraphView,
	makeEditorTabsBase,
	mutationOptions,
	PackageClients,
	PackageSettings,
	PackagesSidebar,
	PaneLayout,
	ProjectActions,
	ProjectEffectRuntimeContext,
	ProjectState,
	packageSettingsQueryOptions,
	SettingsLayout,
} from "@macrograph/project-ui";
import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { createWritableMemo } from "@solid-primitives/memo";
import { createMousePosition } from "@solid-primitives/mouse";
import { isMobile } from "@solid-primitives/platform";
import { makePersisted } from "@solid-primitives/storage";
import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
	useMutation,
	useQuery,
} from "@tanstack/solid-query";
import "@total-typescript/ts-reset";
import { Effect, ManagedRuntime, Option } from "effect";
import { cx } from "cva";
import {
	batch,
	createResource,
	createSignal,
	type JSX,
	Match,
	onMount,
	Show,
	Switch,
} from "solid-js";
import { createStore, produce, reconcile, unwrap } from "solid-js/store";

import { PlaygroundRpc } from "./rpc";
import {
	EffectRuntimeContext,
	RuntimeLayers,
	useEffectRuntime,
	useService,
} from "./runtime";
// import { loadPackages } from "./frontend";

import "@macrograph/project-frontend/styles.css";
import type { Accessor } from "solid-js";
import { createMemo, For } from "solid-js";

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

namespace PaneState {
	export type PaneState = {
		id: number;
		selectedTab: number;
		tabs: Array<TabState.TabState & { tabId: number }>;
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

	return (
		<div class="text-gray-12 font-sans w-full h-full">
			<ProjectEffectRuntimeContext.Provider value={effectRuntime}>
				<EffectRuntimeProvider runtime={effectRuntime}>
					<EffectRuntimeContext.Provider value={effectRuntime}>
						<QueryClientProvider client={client}>
							<Show when={init()}>
								<Inner />
							</Show>
						</QueryClientProvider>
					</EffectRuntimeContext.Provider>
				</EffectRuntimeProvider>
			</ProjectEffectRuntimeContext.Provider>
		</div>
	);
}

// this is very naughty of me but oh well

const [schemaMenu, setSchemaMenu] = createSignal<
	| { open: false }
	| { open: true; position: { x: number; y: number }; paneId: number }
>({ open: false });

const [panes, setPanes] = makePersisted(
	createStore<Record<number, PaneState.PaneState>>({
		0: {
			id: 0,
			selectedTab: 0,
			tabs: [{ tabId: 1, type: "settings", page: "Credentials" }],
		},
		1: {
			id: 1,
			selectedTab: 1,
			tabs: [
				{
					tabId: 0,
					type: "package",
					packageId: Package.Id.make("twitch"),
				},
			],
		},
	}),
	{ name: "editor-panes" },
);

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

	const [paneLayout, setPaneLayout] = makePersisted(
		createStore<PaneLayout.PaneLayout<number> | PaneLayout.Empty>({
			variant: "horizontal",
			panes: [
				{ size: 0.5, variant: "single", pane: 0 },
				{ size: 0.5, variant: "single", pane: 1 },
			],
		}),
		{ name: "editor-pane-layout" },
	);

	// this really needs improving
	function removePane(id: number) {
		batch(() => {
			setPaneLayout((paneLayout) => PaneLayout.removePane(paneLayout, id));
			setPanes(id, undefined!);
		});
	}

	function openTab(data: TabState.TabState) {
		batch(() => {
			const paneIds = Object.keys(panes);

			if (paneIds.length === 0) {
				const id = Math.random();
				setPanes(
					id,
					reconcile<PaneState.PaneState, PaneState.PaneState>({
						id,
						selectedTab: 0,
						tabs: [{ tabId: 0, ...data }],
					}),
				);
				setPaneLayout(
					reconcile({
						variant: "single",
						pane: id,
					}),
				);
				return;
			}

			const paneId = focusedPaneId();
			if (paneId === null) return;

			console.log({ paneId });

			setPanes(
				paneId,
				produce((pane) => {
					const existing = pane.tabs.find(
						(s) => TabState.getKey(s) === TabState.getKey(data),
					);
					if (existing) {
						pane.selectedTab = existing.tabId;
					} else {
						const tabId = Math.random();
						pane.tabs.push({ ...data, tabId });
						pane.selectedTab = tabId;
					}
				}),
			);
		});
	}

	const runtime = useEffectRuntime();

	const [focusedPaneId, setFocusedPaneId] = createWritableMemo<number | null>(
		(v) => {
			const panesIds = Object.keys(panes);
			if (panesIds.length === 0) return null;
			if (typeof v === "number" && panesIds.includes(v?.toString())) return v;
			const id = panesIds[0] ?? null;
			if (id) return Number(id);
			return null;
		},
	);

	const focusedPane = () => {
		const id = focusedPaneId();
		if (id === null) return;
		return panes[id];
	};

	const focusedTab = () => {
		const pane = focusedPane();
		if (!pane) return;
		return pane.tabs.find((t) => t.tabId === pane.selectedTab);
	};

	const contextualSidebar = createMemo<
		| null
		| { type: "graph"; graph: Graph.Id }
		| { type: "node"; graph: Graph.Id; node: Node.Id }
	>((v) => {
		const prevRet = null;
		const pane = focusedPane();
		if (!pane) return prevRet;
		const tab = pane.tabs.find((t) => t.tabId === pane.selectedTab);
		if (tab?.tabId !== pane.selectedTab) return prevRet;
		if (tab.type !== "graph") return prevRet;
		if (tab.selection.length < 1) return { type: "graph", graph: tab.graphId };
		if (tab.selection.length === 1 && tab.selection[0]?.[0] === "Node")
			return { type: "node", graph: tab.graphId, node: tab.selection[0][1] };
		return prevRet;
	}, null);
	const [contextualSidebarOpen, setContextualSidebarOpen] = makePersisted(
		createSignal(!isMobile),
		{ name: "contextual-sidebar" },
	);

	const getSelectedSidebar = () => {
		const t = focusedTab();
		if (t?.type === "graph") return "graphs";
		if (t?.type === "package") return "packages";
		return null;
	};

	const [selectedSidebar, setSelectedSidebar] = createWritableMemo<
		"graphs" | "packages" | null
	>(
		(v) => {
			if (v === null) return null;
			return getSelectedSidebar() ?? v;
		},
		isMobile ? null : getSelectedSidebar(),
	);

	const lastSelectedSidebar = createMemo<"graphs" | "packages">((v) => {
		return selectedSidebar() ?? v;
	}, "graphs");

	const [zoomedPane, setZoomedPane] = createSignal<null | number>(null);

	createEventListener(window, "keydown", (e) => {
		if (e.code === "KeyB" && e.metaKey) {
			e.preventDefault();
			setSelectedSidebar((v) => {
				if (v) return null;
				return "graphs";
			});
		} else if (e.code === "KeyR" && e.metaKey) {
			e.preventDefault();
			setContextualSidebarOpen((o) => !o);
		} else if (e.code === "Escape" && e.shiftKey) {
			setZoomedPane((p) => {
				if (p === null) return focusedPaneId();
				return null;
			});
		} else if (e.code === "ArrowLeft" && e.metaKey) {
			const pane = focusedPaneId();
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
			const pane = focusedPaneId();
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
			const pane = focusedPane();
			if (pane === undefined) return;
			removeTab(pane.id, pane.selectedTab);
			e.preventDefault();
		}
	});

	function removeTab(paneId: number, tabId: number) {
		const pane = panes[paneId];
		if (!pane) return;

		batch(() => {
			if (pane.tabs.length < 2) {
				removePane(paneId);
			} else {
				setPanes(
					paneId,
					produce((pane) => {
						const selectedIndex = pane.tabs.findIndex(
							(t) => t.tabId === pane.selectedTab,
						);
						if (selectedIndex === -1) return;

						pane.tabs = pane.tabs.filter((t) => t.tabId !== tabId);
						if (tabId === pane.selectedTab) {
							const nextId =
								pane.tabs[selectedIndex]?.tabId ?? pane.tabs[0]?.tabId;
							if (nextId !== undefined) pane.selectedTab = nextId;
						}
					}),
				);
			}
		});
	}

	function splitPane(paneId: number, direction: "horizontal" | "vertical") {
		const pane = panes[paneId];
		if (!pane) return;

		const newId = Math.random();

		let success = false;
		batch(() => {
			setPaneLayout((paneLayout) =>
				PaneLayout.splitPane(paneLayout, direction, paneId, newId, () => {
					success = true;
				}),
			);
			if (success) {
				setFocusedPaneId(newId);
				setPanes(newId, {
					...structuredClone(unwrap(pane)),
					tabs: structuredClone(
						pane.tabs
							.filter((t) => t.tabId === pane.selectedTab)
							.map((v) => unwrap(v)),
					),
					id: newId,
				});
			}
		});
	}

	const isTouchDevice = isMobile || navigator.maxTouchPoints > 0;

	return (
		<div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-4">
			<div class="flex flex-row items-center h-9 z-10">
				<button
					type="button"
					onClick={() => {
						setSelectedSidebar(
							selectedSidebar() === "packages" ? null : "packages",
						);
					}}
					data-selected={selectedSidebar() === "packages"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Packages
				</button>
				<button
					type="button"
					onClick={() => {
						setSelectedSidebar(
							selectedSidebar() === "graphs" ? null : "graphs",
						);
					}}
					data-selected={selectedSidebar() === "graphs"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Graphs
				</button>
				<div class="flex-1" />
				<button
					type="button"
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
					onClick={() => {
						openTab({ type: "settings", page: "Credentials" });
					}}
				>
					Settings
				</button>
				{/*<AuthSection />*/}
			</div>
			<Show when={initialize.isSuccess}>
				<div class="flex flex-row flex-1 h-full relative">
					<div class="flex flex-row flex-1 divide-x divide-gray-5 h-full overflow-x-hidden">
						<div class="relative h-full shrink-0 bg-gray-3">
							<Show when={selectedSidebar()}>
								<div class="w-56 flex flex-col items-stretch justify-start divide-y divide-gray-5">
									<Switch>
										<Match when={selectedSidebar() === "graphs"}>
											<GraphsSidebar
												graphs={state.graphs}
												selected={(() => {
													const s = focusedTab();
													if (s?.type === "graph") return s.graphId;
												})()}
												onSelected={(graph) => {
													openTab({
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
										<Match when={selectedSidebar() === "packages"}>
											<PackagesSidebar
												packageId={(() => {
													const s = focusedTab();
													if (s?.type === "package") return s.packageId;
												})()}
												onChange={(packageId) =>
													openTab({ type: "package", packageId })
												}
											/>
										</Match>
									</Switch>
								</div>
							</Show>
							<Show when={isTouchDevice}>
								<button
									type="button"
									class="absolute left-full z-10 top-1/2 -translate-y-1/2 py-2 bg-gray-3 border border-gray-5"
									onClick={() => {
										setSelectedSidebar((s) =>
											s === null ? lastSelectedSidebar() : null,
										);
									}}
								>
									<IconTablerChevronRight
										class={cx("size-3.5", selectedSidebar() && "rotate-180")}
									/>
								</button>
							</Show>
						</div>

						<Show
							when={Object.keys(paneLayout).length > 0}
							fallback={<div class="flex-1" />}
						>
							<EditorPanes panes={paneLayout as PaneLayout.PaneLayout<number>}>
								{(paneId) => {
									const [ref, setRef] = createSignal<HTMLDivElement>();

									createEventListener(ref, "pointerdown", () => {
										setFocusedPaneId(paneId());
									});

									return (
										<Show when={panes[paneId()]}>
											{(pane) => {
												const tabsBase = usePaneTabsBase(pane);

												return (
													<Show
														when={paneId() !== zoomedPane()}
														fallback={<div class="flex-1 bg-gray-4" />}
													>
														<EditorTabs
															ref={setRef}
															{...tabsBase}
															selectedTabId={panes[paneId()]?.selectedTab}
															onChange={(id) =>
																setPanes(paneId(), "selectedTab", id)
															}
															onRemove={(id) => removeTab(paneId(), id)}
															onSplit={(dir) => splitPane(paneId(), dir)}
															onZoom={() => setZoomedPane(paneId())}
															focused={focusedPaneId() === paneId()}
														/>
													</Show>
												);
											}}
										</Show>
									);
								}}
							</EditorPanes>
						</Show>

						<div class="relative h-full shrink-0">
							<Show when={contextualSidebarOpen()}>
								<ContextualSidebar>
									<Show
										when={zoomedPane() === null}
										fallback={<div class="flex-1 bg-gray-4" />}
									>
										<ContextualSidebar.Content
											state={contextualSidebar()}
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
								</ContextualSidebar>
							</Show>
							<Show when={isTouchDevice}>
								<button
									type="button"
									class="absolute right-full z-10 top-1/2 -translate-y-1/2 py-2 bg-gray-3 border border-gray-5"
									onClick={() => {
										setContextualSidebarOpen((o) => !o);
									}}
								>
									<IconTablerChevronRight
										class={cx(
											"size-3.5",
											!contextualSidebarOpen() && "rotate-180",
										)}
									/>
								</button>
							</Show>
						</div>
					</div>

					<Show when={panes[zoomedPane() ?? -1]}>
						{(pane) => {
							const paneId = () => zoomedPane()!;

							createEventListener(window, "keydown", (e) => {
								if (e.key === "Escape") {
									setZoomedPane(null);
								}
							});

							const tabsBase = usePaneTabsBase(pane);

							return (
								<div class="absolute inset-0 z-10 flex items-strech">
									<div class="m-2 divide-x divide-gray-5 flex flex-row flex-1 border border-gray-5 bg-gray-2 pointer-events-auto">
										<EditorTabs
											{...tabsBase}
											selectedTabId={panes[paneId()]?.selectedTab}
											onChange={(id) => setPanes(paneId(), "selectedTab", id)}
											onRemove={(id) => removeTab(paneId(), id)}
											onSplit={(dir) => splitPane(paneId(), dir)}
											onZoom={() => {
												setZoomedPane(null);
											}}
											zoomed
											focused
										/>
										<Show when={contextualSidebarOpen()}>
											<ContextualSidebar>
												<ContextualSidebar.Content
													state={contextualSidebar()}
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
											</ContextualSidebar>
										</Show>
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

const usePaneTabsBase = (pane: Accessor<PaneState.PaneState>) => {
	const rpc = useService(PlaygroundRpc);
	const actions = useService(ProjectActions);
	const { state } = useService(ProjectState);
	const packageClients = useService(PackageClients);
	const runtime = useEffectRuntime();

	const mouse = createMousePosition();

	return makeEditorTabsBase({
		get state() {
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
		schema: {
			graph: {
				getMeta: (tab) => ({ title: tab.graph.name }),
				Component: (tab) => {
					const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
					const bounds = createElementBounds(ref);

					const graphCtx = createGraphContext(
						() => bounds,
						() => tab().transform?.translate,
					);

					createEventListener(window, "keydown", (e) => {
						if (e.code === "Backspace" || e.code === "Delete") {
							actions.DeleteGraphItems(
								rpc.DeleteGraphItems,
								tab().graphId,
								tab().selection,
							);
						} else if (e.code === "Period") {
							if (e.metaKey || e.ctrlKey) {
								setSchemaMenu({
									open: true,
									position: { x: mouse.x, y: mouse.y },
									paneId: pane().id,
								});
							}
						}
					});

					return (
						<GraphContext.Provider value={graphCtx}>
							<GraphView
								ref={setRef}
								nodes={tab().graph.nodes}
								connections={tab().graph.connections}
								selection={tab().selection}
								getSchema={(schemaRef) =>
									Option.fromNullable(
										state.packages[schemaRef.pkg]?.schemas.get(schemaRef.id),
									)
								}
								onContextMenu={(e) => {
									setSchemaMenu({
										open: true,
										position: {
											x: e.clientX,
											y: e.clientY,
										},
										paneId: pane().id,
									});
								}}
								onContextMenuClose={() => {
									setSchemaMenu({ open: false });
								}}
								onItemsSelected={(selection) => {
									setPanes(
										pane().id,
										"tabs",
										(tab) => tab.tabId === pane().selectedTab,
										produce((tab) => {
											if (tab.type !== "graph") return;

											tab.selection = selection;
										}),
									);
								}}
								onSelectionDrag={(items) => {
									actions.SetItemPositions(
										rpc.SetItemPositions,
										tab().graph.id,
										items,
									);
								}}
								onSelectionDragEnd={(items) => {
									actions.SetItemPositions(
										rpc.SetItemPositions,
										tab().graph.id,
										items,
										false,
									);
								}}
								onConnectIO={(from, to) => {
									actions.ConnectIO(rpc.ConnectIO, tab().graph.id, from, to);
								}}
								onDisconnectIO={(io) => {
									actions.DisconnectIO(rpc.DisconnectIO, tab().graph.id, io);
								}}
								onDeleteSelection={() => {
									// actions.DeleteSelection(
									// 	rpc.DeleteSelection,
									// 	tab().graph.id,
									// 	[...tab().selection],
									// );
								}}
								onTranslateChange={(translate) => {
									setPanes(
										pane().id,
										"tabs",
										(tab) => tab.tabId === pane().selectedTab,
										produce((tab) => {
											if (tab.type !== "graph") return;

											tab.transform ??= {
												translate: { x: 0, y: 0 },
												zoom: 1,
											};
											tab.transform.translate = translate;
										}),
									);
								}}
							/>
							<GraphContextMenu
								packages={state.packages}
								position={(() => {
									const s = schemaMenu();
									if (s.open && s.paneId === pane().id) return s.position;
									return null;
								})()}
								onSchemaClick={(schemaRef, position) => {
									actions.CreateNode(
										rpc.CreateNode,
										tab().graph.id,
										schemaRef,
										position,
									);
									setSchemaMenu({ open: false });
								}}
								onClose={() => {
									setSchemaMenu({ open: false });
								}}
							/>
						</GraphContext.Provider>
					);
				},
			},
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
									const credentials = useQuery(() => credentialsQuery(runtime));
									const refetchCredentials = useMutation(() =>
										refetchCredentialsMutation(runtime),
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
							setPanes(
								pane().id,
								"tabs",
								produce((s) => {
									const t = s.find((t) => t.tabId === pane().selectedTab);
									if (t?.type === "settings") {
										t.page = page;
									}
								}),
							);
						}}
					/>
				),
			},
			package: {
				getMeta: (tab) => ({
					title: tab.package.name,
					desc: "Package",
				}),
				Component: (tab) => {
					const rpc = useService(PlaygroundRpc);

					const settingsQuery = useQuery(() =>
						packageSettingsQueryOptions(tab().packageId, (req) =>
							rpc.GetPackageSettings(req).pipe(runtime.runPromise),
						),
					);

					return (
						<PackageSettings
							packageClient={tab().client}
							settingsQuery={settingsQuery}
						/>
					);
				},
			},
		},
	});
};

function EditorPanes<T>(props: {
	panes: PaneLayout.PaneLayout<T>;
	children: (pane: Accessor<T>) => JSX.Element;
}) {
	return (
		<Switch>
			<Match when={props.panes.variant === "single" && props.panes}>
				{(panes) => props.children(() => panes().pane)}
			</Match>
			<Match when={props.panes.variant !== "single" && props.panes}>
				{(panes) => (
					<div
						class={cx(
							"flex flex-1 divide-gray-5",
							panes().variant === "vertical"
								? "flex-col divide-y-1"
								: "flex-row divide-x-1 overflow-x-hidden",
						)}
					>
						<For each={panes().panes}>
							{(pane) => (
								<EditorPanes<T> panes={pane}>{props.children}</EditorPanes>
							)}
						</For>
					</div>
				)}
			</Match>
		</Switch>
	);
}

const credentialsQuery = <E,>(
	r: ManagedRuntime.ManagedRuntime<PlaygroundRpc, E>,
) =>
	queryOptions({
		queryKey: ["credentials"],
		queryFn: () =>
			PlaygroundRpc.pipe(
				Effect.flatMap((rpc) => rpc.GetCredentials()),
				r.runPromise,
			),
	});

const refetchCredentialsMutation = <E,>(
	r: ManagedRuntime.ManagedRuntime<PlaygroundRpc, E>,
) =>
	mutationOptions({
		mutationKey: ["refetchCredentials"],
		mutationFn: () =>
			PlaygroundRpc.pipe(
				Effect.flatMap((rpc) => rpc.RefetchCredentials()),
				r.runPromise,
			),
	});

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
