import { Effect, Option } from "effect";
import { Dialog } from "@kobalte/core";
import { Button, EffectButton } from "@macrograph/package-sdk/ui";
import {
	ContextualSidebar,
	CredentialsPage,
	credentialsQueryOptions,
	defineBasePaneTabController,
	GraphContextMenu,
	Header,
	makeGraphTabSchema,
	makePackageTabSchema,
	NavSidebar,
	type PaneState,
	ProjectPaneLayoutView,
	ProjectPaneTabView,
	refetchCredentialsMutationOptions,
	SettingsLayout,
	type TabState,
	useEditorKeybinds,
	useGraphContext,
	useNavSidebar,
	ZoomedPaneWrapper,
} from "@macrograph/project-ui";
import { focusRingClasses } from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { cx } from "cva";
import type { ValidComponent } from "solid-js";
import { type Accessor, createSignal, For, Show } from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import { AuthActions } from "../Auth";
import { useEffectRuntime, useEffectService } from "../EffectRuntime";
import { PresencePointer } from "../Graph/PresencePointer";
import { type SettingsPage, useLayoutState } from "../LayoutState";
import { ClientListDropdown } from "../Presence/ClientListDropdown";
import { PresenceClients } from "../Presence/PresenceClients";
import { useRealtimeContext } from "../Realtime";
import { ServerRpc } from "../ServerRpc";
import ServerSettings from "./settings/server";

export default function () {
	const layoutState = useLayoutState();
	const navSidebar = useNavSidebar();

	useEditorKeybinds();

	const headerButtonClass = cx(
		"px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3",
		focusRingClasses("inset"),
	);

	return (
		<GraphContextMenu.Provider>
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

						<Show
							when={layoutState.zoomedPane() === null}
							fallback={<div class="flex-1 bg-gray-4" />}
						>
							<ContextualSidebar />
						</Show>
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
			</div>
		</GraphContextMenu.Provider>
	);
}

const usePaneTabController = (
	pane: Accessor<PaneState<SettingsPage>>,
	updateTab: (_: StoreSetter<TabState.TabState<SettingsPage>>) => void,
) => {
	const rpc = useEffectService(ServerRpc.client);
	const [_, setGraphCtxMenu] = GraphContextMenu.useContext();
	const presence = useEffectService(PresenceClients);
	const realtime = useRealtimeContext();

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
			{
				get remoteSelections() {
					const graphCtx = useGraphContext();

					return Object.entries(presence.presenceClients).flatMap(
						([userId, data]) => {
							if (Number(userId) === realtime.id()) return [];

							if (data.selection?.graph === graphCtx.id())
								return [
									{
										colour: data.colour,
										nodes: new Set(data.selection?.nodes ?? []),
									},
								];
							return [];
						},
					);
				},
			},
			(props) => {
				const graphCtx = useGraphContext();

				createEventListener(
					() => graphCtx.ref() ?? undefined,
					"pointermove",
					(e) => {
						rpc
							.SetMousePosition({
								graph: props.graph.id,
								position: graphCtx.getGraphPosition({
									x: e.clientX,
									y: e.clientY,
								}),
							})
							.pipe(Effect.runPromise);
					},
				);

				const graphCtx = useGraphContext();

				return (
					<For each={Object.entries(presence.presenceClients)}>
						{(item) => (
							<Show
								when={
									Number(item[0]) !== realtime.id() &&
									item[1].mouse?.graph === props.graph.id &&
									item[1].mouse
								}
							>
								{(mouse) => (
									<PresencePointer
										style={{
											transform: `translate(${mouse().x - (graphCtx.translate?.x ?? 0)}px, ${mouse().y - (graphCtx.translate?.y ?? 0)}px)`,
										}}
										name={item[1].name}
										colour={item[1].colour}
									/>
								)}
							</Show>
						)}
					</For>
				);
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
	const rpc = useEffectService(ServerRpc.client);
	const runtime = useEffectRuntime();

	const user = useQuery(() => ({
		queryKey: ["user"],
		queryFn: () => rpc.GetUser().pipe(runtime.runPromise),
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
