import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import {
	ContextualSidebar,
	ContextualSidebarProvider,
	CredentialsPage,
	credentialsQueryOptions,
	defineBasePaneTabController,
	GraphContextMenu,
	Header,
	makeGraphTabSchema,
	makePackageTabSchema,
	NavSidebar,
	NavSidebarProvider,
	PackageClients,
	type PaneState,
	ProjectEffectRuntimeContext,
	ProjectPaneLayoutView,
	ProjectPaneTabView,
	ProjectState,
	refetchCredentialsMutationOptions,
	SettingsLayout,
	type TabState,
	useEditorKeybinds,
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
import { Effect, Layer, ManagedRuntime } from "effect";
import * as Packages from "@macrograph/base-packages";
import { PackageEngine } from "@macrograph/package-sdk";
import { Actor, Package, ProjectEvent } from "@macrograph/project-domain";
import { EngineHost, ProjectRuntime } from "@macrograph/project-runtime";
import { focusRingClasses } from "@macrograph/ui";
import { createResource, ErrorBoundary, onMount, Show } from "solid-js";
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
				<ProjectEffectRuntimeContext.Provider value={effectRuntime}>
					<EffectRuntimeProvider runtime={effectRuntime}>
						<EffectRuntimeContext.Provider value={effectRuntime}>
							<QueryClientProvider client={client}>
								<LayoutStateProvider {...layoutState}>
									<NavSidebarProvider>
										<ContextualSidebarProvider
											wrapOpenSignal={(s) =>
												makePersisted(s, { name: "contextual-sidebar" })
											}
										>
											<GraphContextMenu.Provider>
												<Show when={init()}>
													<Inner />
												</Show>
											</GraphContextMenu.Provider>
										</ContextualSidebarProvider>
									</NavSidebarProvider>
								</LayoutStateProvider>
							</QueryClientProvider>
						</EffectRuntimeContext.Provider>
					</EffectRuntimeProvider>
				</ProjectEffectRuntimeContext.Provider>
			</ErrorBoundary>
		</div>
	);
}

function Inner() {
	const { actions: stateActions } = useService(ProjectState);
	const rpc = useService(PlaygroundRpc);

	const initialize = useMutation(() => ({
		mutationFn: () =>
			Effect.gen(function* () {
				const runtime = yield* ProjectRuntime.ProjectRuntime_;
				const project = yield* rpc.GetProject({});

				const packageEngines = yield* Effect.promise(
					() => import("@macrograph/base-packages/engines"),
				);

				for (const [id, engineLayer] of Object.entries(packageEngines)) {
					const layer = engineLayer.pipe(
						Layer.provide(
							Layer.succeed(PackageEngine.CtxTag, {
								emitEvent: () => {
									console.log("emitEvent");
								},
								credentials: Effect.succeed([]),
								dirtyState: runtime
									.publishEvent(
										new ProjectEvent.PackageStateChanged({
											pkg: Package.Id.make(id),
										}),
									)
									.pipe(Effect.provide(Actor.layerSystem)),
								refreshCredential: () => Effect.void,
							}),
						),
					);

					const engineHost = yield* EngineHost.makeMemory(
						(Packages as any)[id].engine,
					).pipe(Effect.provide(layer));

					runtime.engines.set(id, engineHost);
				}

				const packageClients = yield* PackageClients;
				const packageSettings = yield* Effect.promise(
					() => import("@macrograph/base-packages/Settings"),
				);

				const packageMeta = yield* Effect.promise(
					() => import("@macrograph/base-packages/meta"),
				);

				for (const [id, getSettings] of Object.entries(
					packageSettings.default,
				)) {
					yield* packageClients.registerPackageClient(
						Package.Id.make(id),
						yield* Effect.promise(getSettings),
						packageMeta.default[id],
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

	useEditorKeybinds();

	const headerButtonClass = `px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 ${focusRingClasses("inset")}`;
	return (
		<div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-4">
			<Header>
				<button
					type="button"
					onClick={() => {
						navSidebar.toggle("packages");
					}}
					data-selected={navSidebar.state() === "packages"}
					class={headerButtonClass}
				>
					Packages
				</button>
				<button
					type="button"
					onClick={() => {
						navSidebar.toggle("graphs");
					}}
					data-selected={navSidebar.state() === "graphs"}
					class={headerButtonClass}
				>
					Graphs
				</button>
				<button
					type="button"
					onClick={() => {
						navSidebar.toggle("constants");
					}}
					data-selected={navSidebar.state() === "constants"}
					class={headerButtonClass}
				>
					Constants
				</button>
				<div class="flex-1" />
				<button
					type="button"
					class={headerButtonClass}
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
			(state) => {
				if (state.open) setGraphCtxMenu({ ...state, paneId: pane().id });
				else setGraphCtxMenu(state);
			},
		),
		package: makePackageTabSchema(rpc.GetPackageEngineState),
		settings: {
			getMeta: (tab) => ({ title: "Settings", desc: tab.page }),
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
