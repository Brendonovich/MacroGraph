import { Array, Iterable, identity, Option, pipe } from "effect";
import { Select } from "@kobalte/core/select";
import type { Graph, Node, Request } from "@macrograph/project-domain/updated";
import { createContextProvider } from "@solid-primitives/context";
import { isMobile } from "@solid-primitives/platform";
import { useMutation } from "@tanstack/solid-query";
import { cx } from "cva";
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";

import { ProjectActions } from "./Actions";
import { useProjectService } from "./EffectRuntime";
import { useLayoutStateRaw } from "./LayoutState";
import { Sidebar } from "./Sidebar";
import { ProjectState } from "./State";

export function ContextualSidebar() {
	const contextualSidebar = useContextualSidebar();
	const layoutState = useLayoutStateRaw();

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
				<ContextualSidebarContent />
			</Show>
		</Sidebar>
	);
}

export function ContextualSidebarContent() {
	const self = useContextualSidebar();
	const { state } = useProjectService(ProjectState);
	const actions = useProjectService(ProjectActions);

	return (
		<Show
			when={self.state()}
			fallback={
				<div class="w-full h-full text-gray-11 italic text-center flex-1 p-4">
					No information available
				</div>
			}
			keyed
		>
			{(data) => (
				<Switch>
					<Match when={data.type === "graph" && state.graphs[data.graph]}>
						{(graph) => (
							<div class="flex flex-col items-stretch p-2 gap-1">
								<span class="font-medium text-gray-12">Graph Info</span>
								<div class="flex flex-col">
									<span class="text-xs font-medium text-gray-11">Name</span>
									<span class="text-gray-12">{graph().name}</span>
								</div>
								<div class="flex flex-col">
									<span class="text-xs font-medium text-gray-11">
										Total Nodes
									</span>
									<span class="text-gray-12">{graph().nodes.length}</span>
								</div>
							</div>
						)}
					</Match>
					<Match
						when={
							data.type === "node" &&
							state.graphs[data.graph]?.nodes.find((n) => n.id === data.node)
						}
					>
						{(node) => {
							const pkg = () => state.packages[node().schema.pkg];
							const schema = () => pkg()?.schemas.get(node().schema.id);

							return (
								<div class="flex flex-col items-stretch p-2 gap-1">
									<span class="font-medium text-gray-12">Node Info</span>
									<div class="flex flex-col">
										<span class="text-xs font-medium text-gray-11">Name</span>
										<span class="text-gray-12">{node().name}</span>
									</div>
									<Show when={schema()}>
										{(schema) => (
											<>
												<div class="flex flex-col">
													<span class="text-xs font-medium text-gray-11">
														Schema
													</span>
													<span class="text-gray-12">{schema().name}</span>
												</div>
											</>
										)}
									</Show>
									<Show when={schema()}>
										{(schema) => (
											<>
												{schema().properties.length > 0 && (
													<>
														<span class="font-medium text-gray-12 mt-4">
															Properties
														</span>

														<div class="flex flex-col">
															<For each={schema().properties}>
																{(property) => {
																	const setProperty = useMutation(() => ({
																		mutationFn: async (value: string) =>
																			actions.SetNodeProperty(
																				data.graph,
																				node().id,
																				property.id,
																				value,
																			),
																	}));

																	const options = createMemo(() =>
																		pipe(
																			state.constants,
																			Iterable.fromRecord,
																			Iterable.filterMap(([id, constant]) => {
																				if (
																					constant.type === "resource" &&
																					constant.resource ===
																						property.resource
																				)
																					return Option.some({
																						id,
																						display: constant.name,
																					} as const);
																				return Option.none();
																			}),
																			Array.fromIterable,
																		),
																	);

																	const option = () =>
																		options().find(
																			(o) =>
																				o.id ===
																				node().properties?.[property.id],
																		) ?? null;

																	type Option = {
																		id: string;
																		display: string;
																	};

																	return (
																		<>
																			<span class="text-xs font-medium text-gray-11 mb-1">
																				{property.name}
																			</span>
																			<Select<Option>
																				value={option()}
																				options={options()}
																				optionValue="id"
																				optionTextValue="display"
																				placeholder={
																					<i class="text-gray-11">No Value</i>
																				}
																				gutter={4}
																				disabled={
																					!setProperty || setProperty.isPending
																				}
																				onChange={(v) => {
																					if (!v) return;
																					setProperty?.mutate(v.id);
																				}}
																				itemComponent={(props) => (
																					<Show
																						when={props.item.rawValue.id !== ""}
																					>
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
																					<Select.Icon
																						as={
																							IconMaterialSymbolsArrowRightRounded
																						}
																						class="size-4 ui-closed:rotate-90 ui-expanded:-rotate-90 transition-transform"
																					/>
																				</Select.Trigger>
																				<Select.Content class="z-50 ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 overflow-y-hidden text-xs bg-gray-6 rounded space-y-1 p-1">
																					<Select.Listbox class="focus-visible:outline-none max-h-[12rem] overflow-y-auto" />
																				</Select.Content>
																			</Select>
																		</>
																	);
																}}
															</For>
														</div>
													</>
												)}
											</>
										)}
									</Show>

									{/*<div class="flex flex-col">
										<span class="text-xs font-medium text-gray-11">
											Total Nodes
										</span>
										<span class="text-gray-12">
											{node().nodes.length}
										</span>
									</div>*/}
								</div>
							);
						}}
					</Match>
				</Switch>
			)}
		</Show>
	);
}

type IdentityFn<T> = (t: T) => T;

function createContextualSidebar(opts?: {
	wrapOpenSignal?: IdentityFn<ReturnType<typeof createSignal<boolean>>>;
}) {
	const { focusedPane } = useLayoutStateRaw();

	const state = createMemo<
		| null
		| { type: "graph"; graph: Graph.Id }
		| { type: "node"; graph: Graph.Id; node: Node.Id }
	>((_) => {
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

	const [open, setOpen] = (opts?.wrapOpenSignal ?? identity)(
		createSignal(!isMobile),
	);

	return { state, open, setOpen };
}

const [ContextualSidebarProvider, useContextualSidebar_] =
	createContextProvider(
		(opts: NonNullable<Parameters<typeof createContextualSidebar>[0]>) =>
			createContextualSidebar(opts),
	);

const useContextualSidebar = () => {
	const ctx = useContextualSidebar_();
	if (!ctx)
		throw new Error(
			"useNavSidebar must be called underneath a NavSidebarProvider",
		);
	return ctx;
};

export { ContextualSidebarProvider, useContextualSidebar };
