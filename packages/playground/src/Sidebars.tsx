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
import { Select } from "@kobalte/core/select";
import type { Package } from "@macrograph/project-domain/updated";
import { createMutation, useMutation } from "@tanstack/solid-query";
import { cx } from "cva";
import {
	createEffect,
	createMemo,
	For,
	Index,
	Match,
	Show,
	Switch,
} from "solid-js";

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
						return (
							<div class="pt-2">
								<div class="flex flex-row px-2 justify-between">
									<span class="text-gray-11 text-xs font-medium">
										Resource Constants
									</span>
									<AddResourceConstantButton />
								</div>
								<div class="p-2 divide-y divide-gray-5 flex flex-col *:pt-1.5 *:pb-2.5">
									<For each={Object.keys(state.constants)}>
										{(constantId) => {
											const constant = () => state.constants[constantId];

											const updateValue = useMutation(() => ({
												mutationFn: (value: string) =>
													actions.UpdateResourceConstant(
														rpc.UpdateResourceConstant,
														constantId,
														value,
													),
											}));

											const data = () => {
												const c = constant();
												if (!c) return null;
												const pkg = state.packages[c.pkg];
												if (!pkg) return null;
												const resource = pkg.resources[c.resource];
												if (!resource) return null;
												return { constant: c, pkg, resource };
											};

											return (
												<Show when={data()}>
													{(data) => {
														const options = () => data()?.resource.values;

														const option = () =>
															options().find(
																(o) => o.id === data().constant.value,
															) ?? null;

														type Option = {
															id: string;
															display: string;
														};
														return (
															<div class="flex flex-col gap-1 first:pt-0 last:pb-0">
																<div class="flex flex-row justify-between items-baseline">
																	<span>{data().constant.name}</span>
																	<span class="text-xs text-gray-11">
																		{data().resource.name}
																	</span>
																</div>
																<Select<Option>
																	value={option()}
																	options={options()}
																	optionValue="id"
																	optionTextValue="display"
																	placeholder={
																		<i class="text-gray-11">
																			{options().length === 0
																				? "No Options"
																				: "No Value"}
																		</i>
																	}
																	gutter={4}
																	disabled={
																		// !setProperty ||
																		// setProperty.isPending ||
																		options().length === 0
																	}
																	onChange={(v) => {
																		if (!v) return;
																		updateValue.mutate(v.id);
																	}}
																	itemComponent={(props) => (
																		<Show when={props.item.rawValue.id !== ""}>
																			<Select.Item
																				item={props.item}
																				class="p-1 py-0.5 block w-full text-left focus-visible:outline-none ui-highlighted:bg-blue-6 rounded-[0.125rem]"
																			>
																				<Select.ItemLabel>
																					{props.item.rawValue.display}
																				</Select.ItemLabel>
																			</Select.Item>
																		</Show>
																	)}
																>
																	<Select.Trigger
																		class={cx(
																			"flex flex-row items-center w-full text-gray-12 text-xs bg-gray-6 pl-1.5 pr-1 py-0.5 focus-visible:(ring-1 ring-yellow outline-none) appearance-none rounded-sm",
																			!option() &&
																				"ring-1 ring-red-9 outline-none",
																		)}
																	>
																		<Select.Value<Option> class="flex-1 text-left">
																			{(state) =>
																				state.selectedOption().display
																			}
																		</Select.Value>
																		{options().length > 0 && (
																			<Select.Icon
																				as={
																					IconMaterialSymbolsArrowRightRounded
																				}
																				class="size-4 ui-closed:rotate-90 ui-expanded:-rotate-90 transition-transform"
																			/>
																		)}
																	</Select.Trigger>
																	<Select.Content class="z-50 ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 overflow-y-hidden text-xs bg-gray-6 rounded space-y-1 p-1">
																		<Select.Listbox class="focus-visible:outline-none max-h-[12rem] overflow-y-auto" />
																	</Select.Content>
																</Select>
															</div>
														);
													}}
												</Show>
											);
										}}
									</For>
								</div>
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
