import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import { Graph, Package } from "@macrograph/project-domain/updated";
import {
	CredentialsPage,
	createGraphContext,
	EditorTabs,
	GraphContext,
	GraphContextMenu,
	GraphsSidebar,
	GraphView,
	mutationOptions,
	PackageClients,
	PackageSettings,
	PackagesSidebar,
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
	startTransition,
} from "solid-js";
import { createStore, produce } from "solid-js/store";

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
import { For } from "solid-js";

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
		selectedTab: number;
		tabs: Array<TabState.TabState & { tabId: number }>;
	};
}

namespace PaneLayout {
	export type PaneLayout<T> =
		| { variant: "single"; pane: T }
		| {
				variant: "horizontal" | "verical";
				panes: Array<PaneLayout<T> & { size: number }>;
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

function Inner() {
	const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
	const [schemaMenu, setSchemaMenu] = createSignal<
		{ open: false } | { open: true; position: { x: number; y: number } }
	>({ open: false });

	const bounds = createElementBounds(ref);

	const actions = useService(ProjectActions);
	const { state, actions: stateActions } = useService(ProjectState);
	const rpc = useService(PlaygroundRpc);
	const packageClients = useService(PackageClients);

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

	const [panes, setPanes] = createStore<Record<number, PaneState.PaneState>>({
		0: {
			selectedTab: 0,
			tabs: [
				{ tabId: 0, type: "graph", graphId: Graph.Id.make(0), selection: [] },
				{ tabId: 1, type: "settings", page: "Credentials" },
			],
		},
		1: {
			selectedTab: 1,
			tabs: [
				{ tabId: 0, type: "graph", graphId: Graph.Id.make(0), selection: [] },
				{
					tabId: 1,
					type: "package",
					packageId: Package.Id.make("twitch"),
				},
				{
					tabId: 2,
					type: "settings",
					page: "Credentials",
				},
			],
		},
	});

	const [paneLayout, setPaneLayout] = createStore<
		PaneLayout.PaneLayout<number>
	>({
		variant: "horizontal",
		panes: [
			{ size: 0.5, variant: "single", pane: 0 },
			{ size: 0.5, variant: "single", pane: 1 },
		],
	});

	// const getNextTabId = () => {
	// 	const i = tabState.tabIdCounter;
	// 	setTabState("tabIdCounter", i + 1);
	// 	return i;
	// };

	// const currentTabState = () =>
	// 	tabState.tabs.find((state) => state.tabId === tabState.selectedTabId);

	// function openTab(data: TabState.TabState) {
	// 	const existing = tabState.tabs.find(
	// 		(s) => TabState.getKey(s) === TabState.getKey(data),
	// 	);
	// 	if (existing) {
	// 		setTabState("selectedTabId", existing.tabId);
	// 		return;
	// 	}

	// 	const tabId = getNextTabId();
	// 	startTransition(() => {
	// 		batch(() => {
	// 			setTabState(produce((t) => t.tabs.push({ ...data, tabId })));
	// 			setTabState("selectedTabId", tabId);
	// 		});
	// 	});
	// 	return tabId;
	// }

	// function removeTab(tabId: number) {
	// 	batch(() => {
	// 		const index = tabState.tabs.findIndex((state) => state.tabId === tabId);
	// 		setTabState(
	// 			produce((s) => {
	// 				s.tabs.splice(index, 1);
	// 				s.selectedTabId =
	// 					s.tabs[index]?.tabId ?? s.tabs[s.tabs.length - 1]?.tabId ?? null;
	// 			}),
	// 		);
	// 	});
	// }

	const getSelectedSidebar = () => {
		return null;
		// const t = currentTabState();
		// if (t?.type === "graph") return "graphs";
		// if (t?.type === "package") return "packages";
		// return null;
	};

	const [selectedSidebar, setSelectedSidebar] = createWritableMemo<
		"graphs" | "packages" | null
	>((v) => {
		if (v === null) return null;
		return getSelectedSidebar() ?? v;
	}, getSelectedSidebar());

	const mouse = createMousePosition();
	const runtime = useEffectRuntime();

	return (
		<div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-3">
			<div class="flex flex-row items-center h-9 z-10 bg-gray-4">
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
				<div class="flex flex-row flex-1 divide-x divide-gray-5 h-full">
					<Show when={selectedSidebar()}>
						<div class="w-56 h-full flex flex-col items-stretch justify-start divide-y divide-gray-5 shrink-0">
							<Switch>
								<Match when={selectedSidebar() === "graphs"}>
									<GraphsSidebar
										graphs={state.graphs}
										selected={(() => {
											return;
											// const s = currentTabState();
											// if (s?.type === "graph") return s.graphId;
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
											return;
											// const s = currentTabState();
											// if (s?.type === "package") return s.packageId;
										})()}
										onChange={(packageId) =>
											openTab({ type: "package", packageId })
										}
									/>
								</Match>
							</Switch>
						</div>
					</Show>

					<EditorPanes panes={paneLayout}>
						{(paneId) => (
							<Show when={panes[paneId()]}>
								{(pane) => (
									<EditorTabs
										schema={{
											graph: {
												getMeta: (tab) => ({ title: tab.graph.name }),
												Component: (tab) => {
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
																		state.packages[schemaRef.pkg]?.schemas.get(
																			schemaRef.id,
																		),
																	)
																}
																onContextMenu={(e) => {
																	setSchemaMenu({
																		open: true,
																		position: { x: e.clientX, y: e.clientY },
																	});
																}}
																onContextMenuClose={() => {
																	setSchemaMenu({ open: false });
																}}
																onItemsSelected={(selection) => {
																	setPanes(
																		paneId(),
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
																	actions.ConnectIO(
																		rpc.ConnectIO,
																		tab().graph.id,
																		from,
																		to,
																	);
																}}
																onDisconnectIO={(io) => {
																	actions.DisconnectIO(
																		rpc.DisconnectIO,
																		tab().graph.id,
																		io,
																	);
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
																		paneId(),
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
																	if (s.open) return s.position;
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
																	const credentials = useQuery(() =>
																		credentialsQuery(runtime),
																	);
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
																paneId(),
																"tabs",
																produce((s) => {
																	const t = s.find(
																		(t) => t.tabId === pane().selectedTab,
																	);
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
														packageSettingsQueryOptions(
															tab().packageId,
															(req) =>
																rpc
																	.GetPackageSettings(req)
																	.pipe(runtime.runPromise),
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
										}}
										state={pane()
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
											.filter(Boolean)}
										selectedTabId={panes[paneId()]?.selectedTab}
										onChange={(id) => setPanes(paneId(), "selectedTab", id)}
										onRemove={(id) => removeTab(id)}
									/>
								)}
							</Show>
						)}
					</EditorPanes>
				</div>
			</Show>
		</div>
	);
}

function EditorPanes<T>(props: {
	panes: PaneLayout.PaneLayout<T>;
	children: (panes: Accessor<T>) => JSX.Element;
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
							panes().variant === "verical"
								? "flex-col divide-y-1"
								: "flex-row divide-x-1",
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
