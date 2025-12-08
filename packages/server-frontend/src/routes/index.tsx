import { Effect, Option } from "effect";
import { Dialog } from "@kobalte/core";
import {
	Button,
	EffectButton,
	useEffectRuntime,
} from "@macrograph/package-sdk/ui";
import {
	ContextualSidebarContent,
	CredentialsPage,
	credentialsQueryOptions,
	defineBasePaneTabController,
	GraphContextMenu,
	GraphsSidebar,
	Header,
	makeGraphTabSchema,
	makePackageTabSchema,
	PackagesSidebar,
	type PaneState,
	ProjectActions,
	ProjectPaneLayoutView,
	ProjectPaneTabView,
	ProjectState,
	refetchCredentialsMutationOptions,
	SettingsLayout,
	Sidebar,
	type TabState,
	useContextualSidebar,
	useNavSidebar,
	ZoomedPaneWrapper,
} from "@macrograph/project-ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { ValidComponent } from "solid-js";
import {
	type Accessor,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import { AuthActions } from "../Auth";
import { useEffectQuery, useEffectService } from "../EffectRuntime";
import { type SettingsPage, useLayoutState } from "../LayoutState";
import { ClientListDropdown } from "../Presence/ClientListDropdown";
import { ProjectRpc } from "../Project/Rpc";
import ServerSettings from "./settings/server";

export default function () {
	const layoutState = useLayoutState();
	const navSidebar = useNavSidebar();

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
				<AuthSection />
			</Header>
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
								<ProjectPaneTabView controller={tabController} pane={pane()} />

								<ContextualSidebar />
							</ZoomedPaneWrapper>
						);
					}}
				</Show>
			</div>
		</div>
	);
}

function NavSidebar() {
	const actions = useEffectService(ProjectActions);
	const { state } = useEffectService(ProjectState);
	const navSidebar = useNavSidebar();
	const layoutState = useLayoutState();
	const rpc = useEffectService(ProjectRpc.client);

	return (
		<Sidebar
			side="left"
			open={!!navSidebar.state()}
			onOpenChanged={(open) => {
				navSidebar.toggle(open);
			}}
		>
			<Switch>
				<Match when={navSidebar.state() === "graphs"}>
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
				<Match when={navSidebar.state() === "packages"}>
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
	);
}

function ContextualSidebar() {
	const contextualSidebar = useContextualSidebar();
	const layoutState = useLayoutState();
	const rpc = useEffectService(ProjectRpc.client);
	const actions = useEffectService(ProjectActions);

	return (
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
				<ContextualSidebarContent
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
	);
}

const usePaneTabController = (
	pane: Accessor<PaneState<SettingsPage>>,
	updateTab: (_: StoreSetter<TabState.TabState<SettingsPage>>) => void,
) => {
	const rpc = useEffectService(ProjectRpc.client);
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
							name: "Server",
							page: "server",
							Component: ServerSettings,
						},
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
