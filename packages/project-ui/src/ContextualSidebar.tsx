import type { Effect } from "effect";
import { Select } from "@kobalte/core/select";
import {
	type Graph,
	type Node,
	Request,
} from "@macrograph/project-domain/updated";
import { useMutation } from "@tanstack/solid-query";
import { cx } from "cva";
import {
	createEffect,
	createMemo,
	For,
	Match,
	type ParentProps,
	Show,
	Switch,
} from "solid-js";

import { useService } from "./EffectRuntime";
import { ProjectState } from "./State";

function Content(props: {
	state:
		| { type: "graph"; graph: Graph.Id }
		| { type: "node"; graph: Graph.Id; node: Node.Id }
		| null;
	setNodeProperty?: (r: Request.SetNodeProperty) => Promise<void>;
}) {
	const { state } = useService(ProjectState);

	return (
		<Show
			when={props.state}
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
										{(schema) => {
											return (
												<>
													{schema().properties.length > 0 && (
														<>
															<span class="font-medium text-gray-12 mt-4">
																Properties
															</span>

															<div class="flex flex-col">
																<For each={schema().properties}>
																	{(property) => {
																		const setProperty = props.setNodeProperty
																			? useMutation(() => ({
																					mutationFn: async (value: string) =>
																						props.setNodeProperty?.(
																							new Request.SetNodeProperty({
																								graph: data.graph,
																								node: node().id,
																								property: property.id,
																								value,
																							}),
																						),
																				}))
																			: undefined;

																		const options = createMemo(() => [
																			...(pkg()?.resources.get(
																				property.resource,
																			)?.values ?? []),
																		]);

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
																						!setProperty ||
																						setProperty.isPending
																					}
																					onChange={(v) => {
																						if (!v) return;
																						setProperty?.mutate(v.id);
																					}}
																					itemComponent={(props) => (
																						<Show
																							when={
																								props.item.rawValue.id !== ""
																							}
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
											);
										}}
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

export const ContextualSidebar = Object.assign(
	(props: ParentProps) => (
		<div class="w-56 h-full flex flex-col items-stretch justify-start divide-y divide-gray-5 shrink-0 bg-gray-3">
			{props.children}
		</div>
	),
	{ Content },
);
