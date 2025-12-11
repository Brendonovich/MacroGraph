import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	ContextualSidebarProvider,
	CredentialsPage,
	credentialsQueryOptions,
	defineBasePaneTabController,
	GraphContextMenu,
	Header,
	makeGraphTabSchema,
	makePackageTabSchema,
	NavSidebarProvider,
	PackageClients,
	type PaneState,
	ProjectActions,
	ProjectEffectRuntimeContext,
	ProjectPaneLayoutView,
	ProjectPaneTabView,
	ProjectState,
	refetchCredentialsMutationOptions,
	SettingsLayout,
	type TabState,
	useContextualSidebar,
	useNavSidebar,
	ZoomedPaneWrapper,
} from "@macrograph/project-ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { makePersisted } from "@solid-primitives/storage";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/solid-query";
import type { Accessor } from "solid-js";
import "@total-typescript/ts-reset";
import { Effect, ManagedRuntime } from "effect";
import { createResource, onMount, Show } from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import {
	createLayoutState,
	LayoutStateProvider,
	type SettingsPage,
	useLayoutState,
} from "./LayoutState";
import { PlaygroundRpc } from "./rpc";
import {
	EffectRuntimeContext,
	RuntimeLayers,
	useEffectRuntime,
	useService,
} from "./runtime";
import { ContextualSidebar, NavSidebar } from "./Sidebars";

import "@macrograph/project-ui/styles.css";

const effectRuntime = ManagedRuntime.make(RuntimeLayers);

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
								<NavSidebarProvider>
									<ContextualSidebarProvider
										wrapOpenSignal={(s) =>
											makePersisted(s, {
												name: "contextual-sidebar",
											})
										}
									>
										<Show when={init()}>
											<Inner />
										</Show>
									</ContextualSidebarProvider>
								</NavSidebarProvider>
							</LayoutStateProvider>
						</QueryClientProvider>
					</EffectRuntimeContext.Provider>
				</EffectRuntimeProvider>
			</ProjectEffectRuntimeContext.Provider>
		</div>
	);
}

function Inner() {
	const actions = useService(ProjectActions);
	const { actions: stateActions } = useService(ProjectState);
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
	const navSidebar = useNavSidebar();
	const contextualSidebar = useContextualSidebar();

	createEventListener(window, "keydown", (e) => {
		if (e.code === "KeyB" && e.metaKey) {
			e.preventDefault();
			navSidebar.toggle();
		} else if (e.code === "KeyR" && e.metaKey) {
			e.preventDefault();
			contextualSidebar.setOpen((o) => !o);
		} else if (e.code === "Escape" && e.shiftKey) {
			layoutState.toggleZoomedPane(layoutState.focusedPaneId() ?? undefined);
		} else if (e.code === "ArrowLeft" && e.metaKey) {
			if (layoutState.moveSelectedTab(-1)) e.preventDefault();
		} else if (e.code === "ArrowRight" && e.metaKey) {
			if (layoutState.moveSelectedTab(1)) e.preventDefault();
		} else if (e.code === "KeyW" && e.ctrlKey) {
			const pane = layoutState.focusedPane();
			if (pane === undefined) return;
			layoutState.removeTab(pane.id, pane.selectedTab);
			e.preventDefault();
		} else if (e.code === "Backslash" && e.metaKey) {
			const paneId = layoutState.focusedPaneId();
			if (typeof paneId !== "number") return;
			layoutState.splitPane(paneId, "horizontal");
			e.preventDefault();
		}
	});

	return (
		<div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-4">
			<Header>
				<button
					type="button"
					onClick={() => {
						navSidebar.toggle("packages");
					}}
					data-selected={navSidebar.state() === "packages"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Packages
				</button>
				<button
					type="button"
					onClick={() => {
						navSidebar.toggle("graphs");
					}}
					data-selected={navSidebar.state() === "graphs"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Graphs
				</button>
				<button
					type="button"
					onClick={() => {
						navSidebar.toggle("constants");
					}}
					data-selected={navSidebar.state() === "constants"}
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
				>
					Constants
				</button>
				<div class="flex-1" />
				<button
					type="button"
					class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
					onClick={() => {
						layoutState.openTab({ type: "settings", page: "credentials" });
					}}
				>
					Settings
				</button>
				{/*<AuthSection />*/}
			</Header>
			<Show when={initialize.isSuccess}>
				<div class="flex flex-row flex-1 h-full relative">
					<div class="flex flex-row flex-1 divide-x divide-gray-5 h-full overflow-x-hidden">
						<NavSidebar />

						<ProjectPaneLayoutView<SettingsPage>
							makeTabController={(pane) =>
								usePaneTabController(pane, (setter) =>
									layoutState.updateTab(pane().id, pane().selectedTab, setter),
								)
							}
						/>

						<ContextualSidebar />
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
								<ZoomedPaneWrapper>
									<ProjectPaneTabView
										controller={tabController}
										pane={pane()}
									/>

									<ContextualSidebar />
								</ZoomedPaneWrapper>
							);
						}}
					</Show>
				</div>
			</Show>
		</div>
	);
}

const usePaneTabController = (
	pane: Accessor<PaneState<SettingsPage>>,
	updateTab: (_: StoreSetter<TabState.TabState<SettingsPage>>) => void,
) => {
	const rpc = useService(PlaygroundRpc);
	const [_, setGraphCtxMenu] = GraphContextMenu.useContext();

	return defineBasePaneTabController(pane, {
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
		package: makePackageTabSchema(rpc.GetPackageSettings),
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
							page: "credentials",
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
	});
};
