import type { Graph, Node } from "@macrograph/project-domain/updated";
import { For, Match, type ParentProps, Show, Switch } from "solid-js";

import { useService } from "./EffectRuntime";
import { ProjectState } from "./State";

function Content(props: {
	state:
		| { type: "graph"; graph: Graph.Id }
		| { type: "node"; graph: Graph.Id; node: Node.Id }
		| null;
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
							const schema = () =>
								state.packages[node().schema.pkg]?.schemas.get(
									node().schema.id,
								);

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
																{(property) => (
																	<>
																		<span class="text-xs font-medium text-gray-11 mb-1">
																			{property.name}
																		</span>
																		<select class="text-gray-12 text-xs bg-gray-6 px-1.5 py-0.5 focus-visible:(ring-1 ring-yellow outline-none) appearance-none rounded-sm"></select>
																	</>
																)}
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

export const ContextualSidebar = Object.assign(
	(props: ParentProps) => (
		<div class="w-56 h-full flex flex-col items-stretch justify-start divide-y divide-gray-5 shrink-0 bg-gray-3">
			{props.children}
		</div>
	),
	{ Content },
);
