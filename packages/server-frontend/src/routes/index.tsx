import { Effect, Option } from "effect";
import { Dialog } from "@kobalte/core";
import {
	Button,
	EffectButton,
	useEffectRuntime,
} from "@macrograph/package-sdk/ui";
import type { Graph, Package } from "@macrograph/project-domain/updated";
import {
	ContextualSidebar,
	CredentialsPage,
	createContextualSidebarState,
	createSelectedSidebarState,
	credentialsQueryOptions,
	GraphContextMenu,
	GraphsSidebar,
	makeGraphTabSchema,
	makePackageTabSchema,
	PackageClients,
	PackagesSidebar,
	type PaneState,
	ProjectActions,
	ProjectPaneLayoutView,
	ProjectPaneTabView,
	ProjectState,
	refetchCredentialsMutationOptions,
	SettingsLayout,
	Sidebar,
	useLayoutState,
} from "@macrograph/project-ui";
import { PaneLayoutView, TabLayout } from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { makePersisted } from "@solid-primitives/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { ValidComponent } from "solid-js";
import { type Accessor, createSignal, Match, Show, Switch } from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import { AuthActions } from "../Auth";
import { useEffectQuery, useEffectService } from "../EffectRuntime";
import { ClientListDropdown } from "../Presence/ClientListDropdown";
import { ProjectRpc } from "../Project/Rpc";

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

export default function () {
	const { state } = useEffectService(ProjectState);
	const rpc = useEffectService(ProjectRpc.client);

	const actions = useEffectService(ProjectActions);

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
				<AuthSection />
			</div>
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

					{/*<div class="flex flex-col items-stretch flex-1 overflow-hidden">
					<Show when={tabState.tabs.length > 0}>
						<ul class="flex flex-row items-start divide-x divide-gray-5 overflow-x-auto scrollbar-none shrink-0">
							<For each={tabState.tabs}>
								{(tab) => (
									<li
										class="h-8 relative group"
										data-selected={tab.tabId === tabState.selectedTabId}
									>
										<button
											type="button"
											class="h-full px-4 flex flex-row items-center bg-gray-3 group-data-[selected='true']:(bg-gray-2 border-transparent) border-b border-gray-5 focus-visible:(ring-1 ring-inset ring-yellow outline-none) text-nowrap"
											onClick={() => setTabState("selectedTabId", tab.tabId)}
										>
											{(() => {
												if (tab.type === "graph") {
													const graph = state.graphs[tab.graphId];
													return graph?.name ?? `Graph ${tab.graphId}`;
												}
												if (tab.type === "package")
													return (
														<>
															<span>{tab.package}</span>
															<span class="ml-1 text-xs text-gray-11">
																Package
															</span>
														</>
													);
												if (tab.type === "settings")
													return (
														<>
															<span>{tab.page}</span>
															<span class="ml-1 text-xs text-gray-11">
																Settings
															</span>
														</>
													);
											})()}
										</button>
										<div class="opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute inset-y-0.5 pl-2 pr-1 right-0 flex items-center justify-center bg-gradient-to-gray-3 to-20% group-data-[selected='true']:(bg-gradient-to-gray-2 to-20%) bg-gradient-to-r from-transparent">
											<button
												type="button"
												class="bg-transparent hover:bg-gray-6 p-0.5 focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
												onClick={() => removeTab(tab.tabId)}
											>
												<IconBiX class="size-3.5" />
											</button>
										</div>
									</li>
								)}
							</For>
							<div class="h-full flex-1 border-b border-gray-5" />
						</ul>
					</Show>

					<Suspense>
						<Switch>
							<Match
								when={(() => {
									const s = currentTabState();
									if (s?.type === "graph") return state.graphs[s.graphId];
								})()}
								keyed
							>
								{(graph) => {
									const [selection, setSelection] = createStore<
										| { graphId: Graph.Id; items: Set<Node.Id> }
										| { graphId: null }
									>({ graphId: null });

									const [ref, setRef] = createSignal<HTMLDivElement | null>(
										null,
									);

									const bounds = createElementBounds(ref);
									const mouse = createMousePosition();

									const [schemaMenu, setSchemaMenu] = createSignal<
										| { open: false }
										| { open: true; position: { x: number; y: number } }
									>({ open: false });

									createEventListener(window, "keydown", (e) => {
										if (e.code === "Backspace" || e.code === "Delete") {
											if (selection.graphId !== null) {
												actions.DeleteSelection(selection.graphId, [
													...selection.items,
												]);
											}
										} else if (e.code === "Period") {
											if (e.metaKey || e.ctrlKey) {
												setSchemaMenu({
													open: true,
													position: {
														x: mouse.x - (bounds.left ?? 0),
														y: mouse.y - (bounds.top ?? 0),
													},
												});
											}
										}
									});

									createEffect(() => {
										rpc
											.SetSelection({
												value:
													selection.graphId === null
														? null
														: {
																graph: selection.graphId,
																nodes: [...selection.items],
															},
											})
											.pipe(Effect.runPromise);
									});

									createEventListener(
										() => ref() ?? undefined,
										"pointermove",
										(e) => {
											rpc
												.SetMousePosition({
													graph: graph.id,
													position: {
														x: e.clientX - (bounds.left ?? 0),
														y: e.clientY - (bounds.top ?? 0),
													},
												})
												.pipe(Effect.runPromise);
										},
									);

									return (
										<div class="w-full h-full bg-gray-2 flex">
											<GraphContextProvider bounds={bounds}>
												<GraphView
													ref={setRef}
													nodes={graph.nodes}
													connections={graph.connections}
													selection={
														selection.graphId === graph.id
															? selection.items
															: new Set()
													}
													getSchema={(ref) =>
														Option.fromNullable(
															state.packages[ref.pkgId]?.schemas[ref.schemaId],
														)
													}
													remoteSelections={Object.entries(
														presence.clients,
													).flatMap(([userId, data]) => {
														if (Number(userId) === realtime.id()) return [];

														if (data.selection?.graph === graph.id)
															return [
																{
																	colour: data.colour,
																	nodes: new Set(data.selection.nodes),
																},
															];
														return [];
													})}
													onItemsSelected={(items) => {
														setSelection(
															reconcile({ graphId: graph.id, items }),
														);
													}}
													onConnectIO={(from, to) => {
														actions.ConnectIO(graph.id, from, to);
													}}
													onDisconnectIO={(io) => {
														actions.DisconnectIO(graph.id, io);
													}}
													onContextMenu={(position) => {
														setSchemaMenu({ open: true, position });
													}}
													onContextMenuClose={() => {
														setSchemaMenu({ open: false });
													}}
													onSelectionMoved={(items) => {
														if (selection.graphId === null) return;

														actions.SetNodePositions(graph.id, items);
													}}
													onDeleteSelection={() => {
														if (selection.graphId === null) return;
														actions.DeleteSelection(graph.id, [
															...selection.items,
														]);
													}}
												/>
												<For each={Object.entries(presence.clients)}>
													{(item) => (
														<Show
															when={
																Number(item[0]) !== realtime.id() &&
																item[1].mouse?.graph === graph.id &&
																item[1].mouse
															}
														>
															{(mouse) => (
																<PresencePointer
																	style={{
																		transform: `translate(${
																			mouse().x + (bounds.left ?? 0)
																		}px, ${mouse().y + (bounds.top ?? 0)}px)`,
																	}}
																	name={item[1].name}
																	colour={item[1].colour}
																/>
															)}
														</Show>
													)}
												</For>

												<GraphContextMenu
													packages={state.packages}
													position={(() => {
														const s = schemaMenu();
														if (s.open) return s.position;
														return null;
													})()}
													onSchemaClick={(schemaRef) => {
														actions.CreateNode(graph.id, schemaRef, [
															schemaRef.position.x,
															schemaRef.position.y,
														]);
														setSchemaMenu({ open: false });
													}}
												/>
											</GraphContextProvider>
										</div>
									);
								}}
							</Match>
							<Match
								when={(() => {
									const s = currentTabState();
									if (s?.type === "package")
										return Option.getOrUndefined(
											packagesSettings.getPackage(s.package)?.pipe(
												Option.map((stuff) => ({
													...stuff,
													id: s.package,
												})),
											),
										);
								})()}
							>
								{(settings) => {
									const rpc = useProjectService(ProjectRpc.client);

									const state = useEffectQuery(() => ({
										queryKey: ["package-state", settings().id] as const,
										queryFn: ({ queryKey }) =>
											rpc.GetPackageSettings({ package: queryKey[1] }),
										reconcile: (o, n) => reconcile(n)(o),
									}));

									createScopedEffect(() =>
										settings().settingsChanges.pipe(
											Effect.flatMap(
												Stream.runForEach(() =>
													Effect.sync(() => state.refetch()),
												),
											),
										),
									);

									return (
										<div class="w-full h-full bg-gray-2">
											<div class="flex flex-col items-stretch w-full max-w-120 p-4">
												<MatchEffectQuery
													query={state}
													onSuccess={(state) => (
														<Dynamic
															component={settings().SettingsUI}
															rpc={settings().rpcClient}
															state={state()}
															globalState={{
																auth: { state: "logged-in", userId: "" },
																logsPanelOpen: false,
															}}
														/>
													)}
												/>
											</div>
										</div>
									);
								}}
							</Match>
							<Match
								when={(() => {
									const s = currentTabState();
									if (s?.type === "settings") return s;
								})()}
							>
								{(settings) => (
									<div class="flex flex-row divide-x divide-gray-5 flex-1 bg-gray-2">
										<nav class="w-40 text-sm shrink-0 flex flex-col">
											<span class="px-1 py-1 text-xs text-gray-10 font-medium">
												Admin
											</span>
											<ul class="flex-1">
												<For
													each={[
														{ name: "Server", page: "Server" as const },
														{
															name: "Credentials",
															page: "Credentials" as const,
														},
													]}
												>
													{(item) => (
														<li>
															<button
																type="button"
																data-selected={item.page === settings().page}
																class="w-full data-[selected='true']:bg-gray-3 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
																onClick={() => {
																	setTabState(
																		produce((s) => {
																			const t = s.tabs.find(
																				(t) =>
																					t.tabId === tabState.selectedTabId,
																			);
																			if (t?.type === "settings") {
																				t.page = item.page;
																			}
																		}),
																	);
																}}
															>
																{item.name}
															</button>
														</li>
													)}
												</For>
											</ul>
										</nav>
										<div class="max-w-lg w-full flex flex-col items-stretch p-4 text-sm">
											<Suspense>
												<Switch>
													<Match
														when={(() => {
															const s = settings();
															if (s.type === "settings") return s;
														})()}
													>
														{(settings) => (
															<Switch>
																<Match when={settings().page === "Server"}>
																	<ServerSettings />
																</Match>
																<Match when={settings().page === "Credentials"}>
																<ServerSettings />
																	<CredentialsSettings />
																</Match>
															</Switch>
														)}
													</Match>
												</Switch>
											</Suspense>
										</div>
									</div>
								)}
							</Match>
						</Switch>
					</Suspense>
				</div>*/}
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
		</div>
	);
}

const usePaneTabController = (
	pane: Accessor<PaneState>,
	updateTab: (_: StoreSetter<TabState.TabState>) => void,
) => {
	const rpc = useEffectService(ProjectRpc.client);
	const [_, setGraphCtxMenu] = GraphContextMenu.useContext();

	return TabLayout.defineController({
		get tabs() {
			const packageClients = useEffectService(PackageClients);
			const { state } = useEffectService(ProjectState);

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

function AuthSection() {
	const rpc = useEffectService(ProjectRpc.client);

	const user = useEffectQuery(() => ({
		queryKey: ["user"],
		queryFn: () => rpc.GetUser(),
	}));

	return (
		<>
			<ClientListDropdown />
			{user.data && Option.isNone(user.data) && <ClientLoginButton />}
		</>
	);
}

function ClientLoginButton() {
	const queryClient = useQueryClient();
	const [open, setOpen] = createSignal(false);
	const authActions = useEffectService(AuthActions);

	return (
		<Dialog.Root open={open()} onOpenChange={setOpen}>
			<Dialog.Trigger<ValidComponent>
				as={(props) => <Button {...props} shape="block" />}
			>
				Login
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 animate-in fade-in" />
				<div class="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in-95">
					<Dialog.Content class="z-50 bg-gray-1 p-4">
						<span>Login</span>
						<p>Use the button below to login via macrograph.app</p>
						<EffectButton
							onClick={() =>
								authActions.login.pipe(
									Effect.zipLeft(
										Effect.promise(() => {
											setOpen(false);
											return queryClient.invalidateQueries();
										}),
									),
								)
							}
						>
							Open Login Page
						</EffectButton>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
