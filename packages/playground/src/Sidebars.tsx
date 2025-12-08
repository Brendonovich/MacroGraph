import {
	ContextualSidebarContent,
	GraphsSidebar,
	PackagesSidebar,
	ProjectActions,
	ProjectState,
	Sidebar,
	useContextualSidebar,
	useNavSidebar,
} from "@macrograph/project-ui";
import "@total-typescript/ts-reset";
import { type Array, pipe, Record } from "effect";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import type { Package } from "@macrograph/project-domain/updated";
import { createMemo, For, Index, Match, Show, Switch } from "solid-js";

import { useLayoutState } from "./LayoutState";
import { PlaygroundRpc } from "./rpc";
import { useService } from "./runtime";

export function NavSidebar() {
	const actions = useService(ProjectActions);
	const { state } = useService(ProjectState);
	const navSidebar = useNavSidebar();
	const layoutState = useLayoutState();
	const rpc = useService(PlaygroundRpc);

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
				<Match when={navSidebar.state() === "constants"}>
					{(_) => {
						const sortedConstants = () => {
							const constantsEntries = Record.toEntries(state.constants);

							const retArr: Array<
								[Package.Id, Array<[string, Array<string>]>]
							> = [];
							for (const [pkgId, pkg] of Record.toEntries(state.packages)) {
								const pkgArr: Array<[string, Array<string>]> = [];

								for (const [resourceId, _] of pipe(
									pkg.resources,
									Record.toEntries,
									(a) => a.sort((a, b) => a[1].name.localeCompare(b[1].name)),
								)) {
									const resourceConstants = constantsEntries.filter(
										(c) =>
											c[1].type === "resource" &&
											c[1].pkg === pkgId &&
											c[1].resource === resourceId,
									);
									if (resourceConstants.length > 0) continue;
									pkgArr.push([resourceId, resourceConstants.map((v) => v[0])]);
								}

								if (pkgArr.length > 0) continue;
								retArr.push([pkgId, pkgArr]);
							}

							return retArr;
						};

						return (
							<div class="pt-2">
								<div class="flex flex-row px-2 justify-between">
									<span class="text-gray-11 text-xs font-medium">
										Resource Constants
									</span>
									<AddResourceConstantButton />
								</div>
								<For each={Object.values(state.constants)}>
									{(constant) => (
										<div>
											<span>{constant.name}</span>
										</div>
									)}
								</For>
							</div>
						);
					}}
				</Match>
			</Switch>
		</Sidebar>
	);
}

function AddResourceConstantButton() {
	const actions = useService(ProjectActions);
	const { state } = useService(ProjectState);
	const rpc = useService(PlaygroundRpc);

	return (
		<DropdownMenu placement="bottom">
			<DropdownMenu.Trigger
				title="Create Resource Constant"
				class="size-5 flex items-center justify-center bg-transparent text-gray-11 hover:(bg-gray-6 text-gray-12) rounded-sm focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
			>
				<IconBiX class="rotate-45" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class="p-1 bg-gray-3 flex flex-col gap-1 z-10 text-xs border border-gray-5 animate-in fade-in slide-in-from-top-1 focus-visible:outline-none">
					<Index
						each={Record.toEntries(state.packages).filter(
							(p) => Record.size(p[1].resources) > 0,
						)}
					>
						{(pkg) => (
							<Show when={state.packages[pkg()[0]]}>
								{(pkg) => {
									const resources = createMemo(() =>
										Record.toEntries(pkg().resources),
									);

									return (
										<Show when={resources().length > 0}>
											<div>
												<span class="text-gray-11">{pkg().name}</span>
												<For each={resources()}>
													{(resource) => (
														<DropdownMenu.Item
															class="py-0.5 px-1 @hover-bg-gray-5 cursor-default rounded focus-visible:(ring-1 ring-yellow outline-none)"
															onSelect={() => {
																actions.CreateResourceConstant(
																	rpc.CreateResourceConstant,
																	pkg().id,
																	resource[0],
																);
															}}
														>
															{resource[1].name}
														</DropdownMenu.Item>
													)}
												</For>
											</div>
										</Show>
									);
								}}
							</Show>
						)}
					</Index>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu>
	);
}

export function ContextualSidebar() {
	const actions = useService(ProjectActions);
	const contextualSidebar = useContextualSidebar();
	const layoutState = useLayoutState();
	const rpc = useService(PlaygroundRpc);

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
