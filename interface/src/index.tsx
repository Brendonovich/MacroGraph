import { Tabs } from "@kobalte/core";
import {
	type ClipboardItem,
	deserializeClipboardItem,
	readFromClipboard,
	serializeConnections,
	writeClipboardItemToClipboard,
} from "@macrograph/clipboard";
import {
	type Core,
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type Graph as GraphModel,
	type Node,
	ScopeInput,
	ScopeOutput,
	type XY,
	getNodesInRect,
	pinIsOutput,
} from "@macrograph/runtime";
import {
	deserializeCommentBox,
	deserializeConnections,
	deserializeGraph,
	deserializeNode,
	deserializeProject,
	type serde,
	serializeCommentBox,
	serializeNode,
} from "@macrograph/runtime-serde";
import { createElementBounds } from "@solid-primitives/bounds";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "@total-typescript/ts-reset";
import * as Solid from "solid-js";
import { createStore, produce } from "solid-js/store";
import { toast } from "solid-sonner";
import type * as v from "valibot";

import * as Sidebars from "./Sidebar";
import { Graph } from "./components/Graph";
import {
	type GraphState,
	createGraphState,
	toGraphSpace,
} from "./components/Graph/Context";
import { GRID_SIZE, SHIFT_MULTIPLIER } from "./components/Graph/util";
import { SchemaMenu } from "./components/SchemaMenu";
import { MIN_WIDTH, Sidebar } from "./components/Sidebar";
import {
	type Environment,
	InterfaceContextProvider,
	useInterfaceContext,
} from "./context";
import "./global.css";
import { isCtrlEvent } from "./util";
import {
	CreateNodeInput,
	GraphItemPositionInput,
	HistoryActionEntry,
} from "./actions";

export * from "./platform";
export * from "./ConnectionsDialog";

export type GraphBounds = XY & {
	width: number;
	height: number;
};

const queryClient = new QueryClient();

export function Interface(props: { core: Core; environment: Environment }) {
	return (
		<InterfaceContextProvider core={props.core} environment={props.environment}>
			<QueryClientProvider client={queryClient}>
				<ProjectInterface />
			</QueryClientProvider>
		</InterfaceContextProvider>
	);
}

type CurrentGraph = {
	model: GraphModel;
	state: GraphState;
	index: number;
};

function ProjectInterface() {
	const ctx = useInterfaceContext();
	const {
		leftSidebar,
		rightSidebar,
		currentGraphIndex,
		setCurrentGraphIndex,
		graphStates,
		setGraphStates,
	} = useInterfaceContext();

	const [graphBounds, setGraphBounds] = createStore<GraphBounds>({
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	});

	const currentGraph = Solid.createMemo(() => {
		const index = ctx.currentGraphIndex();
		if (index === null) return;

		const state = graphStates[index];
		if (!state) return;

		const model = ctx.core.project.graphs.get(state.id);
		if (!model) return;

		return { model, state, index } as CurrentGraph;
	});

	// will account for multi-pane in future
	const [hoveredPane, setHoveredPane] = Solid.createSignal<null | true>(null);

	const hoveredGraph = Solid.createMemo(() => {
		if (hoveredPane()) return currentGraph();
	});

	createKeydownShortcuts(currentGraph, hoveredGraph, graphBounds);

	const firstGraph = ctx.core.project.graphs.values().next().value;
	if (graphStates.length === 0 && firstGraph)
		setGraphStates([createGraphState(firstGraph)]);

	// reduces the current graph index if the current graph
	// is the end graph and it gets deleted
	Solid.createEffect(() => {
		if (currentGraph()) return;
		ctx.setCurrentGraphIndex(Math.max(0, ctx.currentGraphIndex() - 1));
	});

	// removes graph states if graphs are deleted
	Solid.createEffect(() => {
		for (const state of graphStates) {
			const graph = ctx.core.project.graphs.get(state.id);
			if (!graph) setGraphStates(graphStates.filter((s) => s.id !== state.id));
		}
	});

	const [rootRef, setRootRef] = Solid.createSignal<
		HTMLDivElement | undefined
	>();
	const rootBounds = createElementBounds(rootRef);

	return (
		<div
			ref={setRootRef}
			class="relative w-full h-full flex flex-row select-none bg-neutral-800 text-white animate-in fade-in"
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
		>
			<Solid.Show when={ctx.leftSidebar.state.open}>
				<div class="animate-in slide-in-from-left-4 fade-in flex flex-row">
					<Sidebar
						width={Math.max(ctx.leftSidebar.state.width, MIN_WIDTH)}
						name="Project"
						initialValue={["Graphs"]}
					>
						<Sidebars.Project
							currentGraph={currentGraph()?.model}
							project={ctx.core.project}
							onGraphClicked={(graph) => {
								const currentIndex = graphStates.findIndex(
									(s) => s.id === graph.id,
								);

								if (currentIndex === -1) {
									setGraphStates((s) => [...s, createGraphState(graph)]);
									setCurrentGraphIndex(graphStates.length - 1);
								} else setCurrentGraphIndex(currentIndex);
							}}
						/>
					</Sidebar>

					<ResizeHandle
						width={leftSidebar.state.width}
						side="right"
						onResize={(width) => leftSidebar.setState({ width })}
						onResizeEnd={(width) =>
							leftSidebar.state.open &&
							width < MIN_WIDTH &&
							leftSidebar.setState({ width: MIN_WIDTH })
						}
					/>
				</div>
			</Solid.Show>

			<div class="flex-1 flex divide-y divide-neutral-700 flex-col h-full justify-center items-center text-white overflow-x-hidden animate-in origin-top">
				<Solid.Show when={currentGraph() !== undefined}>
					<Tabs.Root
						class="overflow-x-auto w-full scrollbar scrollbar-none"
						value={currentGraphIndex().toString()}
					>
						<Tabs.List class="h-8 flex flex-row relative text-sm">
							<Tabs.Indicator class="absolute inset-0 transition-[transform,width]">
								<div class="bg-white/20 w-full h-full" />
							</Tabs.Indicator>
							<Solid.For
								each={graphStates
									.map((state) => {
										const graph = ctx.core.project.graphs.get(state.id);
										if (!graph) return;

										return [state, graph] as const;
									})
									.filter(Boolean)}
							>
								{([_state, graph], index) => (
									<Tabs.Trigger
										value={index().toString()}
										type="button"
										class="py-2 px-4 flex flex-row items-center relative group shrink-0 whitespace-nowrap transition-colors"
										onClick={() => setCurrentGraphIndex(index)}
									>
										<span class="font-medium">{graph.name}</span>
										<button
											type="button"
											class="absolute right-1 hover:bg-white/20 rounded-[0.125rem] opacity-0 group-hover:opacity-100"
										>
											<IconHeroiconsXMarkSolid
												class="size-2"
												stroke-width={1}
												onClick={(e) => {
													e.stopPropagation();

													Solid.batch(() => {
														setGraphStates(
															produce((states) => {
																states.splice(index(), 1);
																return states;
															}),
														);
													});
												}}
											/>
										</button>
									</Tabs.Trigger>
								)}
							</Solid.For>
							<div class="flex-1" />
						</Tabs.List>
					</Tabs.Root>
				</Solid.Show>
				<Solid.Show
					when={currentGraph()}
					fallback={
						<span class="text-neutral-400 font-medium">No graph selected</span>
					}
				>
					{(graph) => (
						<Graph
							graph={graph().model}
							state={graph().state}
							onMouseEnter={() => setHoveredPane(true)}
							onMouseMove={() => setHoveredPane(true)}
							onMouseLeave={() => setHoveredPane(null)}
							onItemsSelected={(id) => {
								setGraphStates(graph().index, { selectedItemIds: id });
							}}
							onBoundsChange={setGraphBounds}
							onSizeChange={setGraphBounds}
							onScaleChange={(scale) => {
								setGraphStates(graph().index, {
									scale,
								});
							}}
							onTranslateChange={(translate) => {
								setGraphStates(
									produce((states) => {
										states[graph().index]!.translate = translate;
										return states;
									}),
								);
							}}
							onMouseDown={(e) => {
								if (e.button === 0) {
									Solid.batch(() => {
										setGraphStates(graph().index, {
											selectedItemIds: [],
										});
										ctx.setState({ status: "idle" });
									});
								}
							}}
						/>
					)}
				</Solid.Show>
			</div>

			<Solid.Show when={rightSidebar.state.open}>
				<div class="animate-in slide-in-from-right-4 fade-in flex flex-row">
					<ResizeHandle
						width={rightSidebar.state.width}
						side="left"
						onResize={(width) => rightSidebar.setState({ width })}
						onResizeEnd={(width) =>
							rightSidebar.state.open &&
							width < MIN_WIDTH &&
							rightSidebar.setState({ width: MIN_WIDTH })
						}
					/>

					<Solid.Show
						when={currentGraph()}
						fallback={
							<Sidebar
								width={Math.max(rightSidebar.state.width, MIN_WIDTH)}
								name="Blank"
							/>
						}
					>
						{(graph) => (
							<Solid.Switch
								fallback={
									<Sidebar
										width={Math.max(rightSidebar.state.width, MIN_WIDTH)}
										name="Graph"
										initialValue={["Graph Variables"]}
									>
										<Solid.Show
											when={graph().state.selectedItemIds.length === 0}
											fallback={
												<div class="pt-4 text-center w-full text-neutral-400 text-sm">
													Multiple Items Selected
												</div>
											}
										>
											<Sidebars.Graph graph={graph().model} />
										</Solid.Show>
									</Sidebar>
								}
							>
								<Solid.Match
									when={(() => {
										const {
											model,
											state: { selectedItemIds },
										} = graph();
										if (selectedItemIds.length > 1) return;

										const selectedItemId = selectedItemIds[0];
										if (!selectedItemId || selectedItemId.type !== "node")
											return;

										return model.nodes.get(selectedItemId.id);
									})()}
								>
									{(node) => (
										<Sidebar
											width={Math.max(rightSidebar.state.width, MIN_WIDTH)}
											name="Node"
											initialValue={["Node Info"]}
										>
											<Sidebars.Node node={node()} />
										</Sidebar>
									)}
								</Solid.Match>
								<Solid.Match
									when={(() => {
										const {
											model,
											state: { selectedItemIds },
										} = graph();
										if (selectedItemIds.length > 1) return;

										const selectedItemId = selectedItemIds[0];
										if (!selectedItemId || selectedItemId.type !== "commentBox")
											return;

										return model.commentBoxes.get(selectedItemId.id);
									})()}
								>
									{(box) => (
										<Sidebar
											width={Math.max(rightSidebar.state.width, MIN_WIDTH)}
											name="Comment Box"
											initialValue={["Comment Box Info"]}
										>
											<Sidebars.CommentBox box={box()} />
										</Sidebar>
									)}
								</Solid.Match>
							</Solid.Switch>
						)}
					</Solid.Show>
				</div>
			</Solid.Show>

			<Solid.Show
				when={(() => {
					const state = ctx.state;

					return (
						(state.status === "schemaMenuOpen" && {
							...state,
							suggestion: undefined,
						}) ||
						(state.status === "connectionAssignMode" &&
							state.state.status === "schemaMenuOpen" && {
								...state.state,
								suggestion: { pin: state.pin },
							}) ||
						(state.status === "pinDragMode" &&
							state.state.status === "schemaMenuOpen" && {
								...state.state,
								suggestion: { pin: state.pin },
							})
					);
				})()}
			>
				{(data) => {
					const graph = Solid.createMemo(() => {
						return ctx.core.project.graphs.get(data().graph.id);
					});

					Solid.createEffect(() => {
						if (!graph())
							ctx.setState({
								status: "idle",
							});
					});

					const graphPosition = () =>
						toGraphSpace(data().position, graphBounds, data().graph);

					return (
						<Solid.Show when={graph()}>
							{(_) => (
								<SchemaMenu
									suggestion={data().suggestion}
									graph={data().graph}
									position={{
										x: data().position.x - (rootBounds.left ?? 0),
										y: data().position.y - (rootBounds.top ?? 0),
									}}
									onClose={() => {
										ctx.setState({ status: "idle" });
									}}
									onCreateCommentBox={() => {
										Solid.batch(() => {
											const box = ctx.execute("createCommentBox", {
												graphId: data().graph.id,
												position: graphPosition(),
											});
											if (!box) return;

											const [_, set] = createStore(data().graph);
											set("selectedItemIds", [
												{ type: "commentBox", id: box.id },
											]);

											ctx.save();
											ctx.setState({ status: "idle" });
										});
									}}
									onSchemaClicked={(schema, targetSuggestion) => {
										const graphId = data().graph.id;
										const pin = Solid.batch(() => {
											const input: CreateNodeInput = {
												graphId,
												schema,
												position: graphPosition(),
											};

											const { suggestion: sourceSuggestion, graph } = data();

											if (ctx.state.status === "connectionAssignMode") {
												ctx.setState({
													...ctx.state,
													state: { status: "active" },
												});
											} else {
												ctx.setState({ status: "idle" });
											}

											if (sourceSuggestion && targetSuggestion) {
												input.connection = {
													fromPinId: targetSuggestion.pin,
													to: {
														variant: pinIsOutput(sourceSuggestion.pin)
															? "o"
															: "i",
														nodeId: sourceSuggestion.pin.node.id,
														pinId: sourceSuggestion.pin.id,
													},
												};
											}

											const node = ctx.execute("createNode", input);
											if (!node) return;

											const [_, set] = createStore(graph);
											set("selectedItemIds", [{ type: "node", id: node.id }]);

											if (sourceSuggestion && targetSuggestion) {
												if (pinIsOutput(sourceSuggestion.pin))
													return node.input(targetSuggestion.pin);
												else return node.output(targetSuggestion.pin);
											}
										});

										if (pin) {
											const pinPosition = ctx.pinPositions.get(pin);
											const nodeSize = ctx.nodeSizes.get(pin.node);
											if (!pinPosition || !nodeSize) return;

											const nodeX = pin.node.state.position.x;

											const xDelta = !pinIsOutput(pin)
												? nodeX - pinPosition.x
												: -nodeSize.width +
													(nodeX + nodeSize.width - pinPosition.x);

											const position = {
												x: pin.node.state.position.x + xDelta,
												y:
													pin.node.state.position.y -
													(pinPosition.y - pin.node.state.position.y),
											};
											ctx.execute(
												"setGraphItemPositions",
												{
													graphId,
													items: [
														{
															itemId: pin.node.id,
															itemVariant: "node",
															position,
														},
													],
												},
												{ ephemeral: true },
											);

											const historyEntry = ctx.history[ctx.history.length - 1];
											if (historyEntry?.type === "createNode") {
												const entry =
													historyEntry.entry as unknown as HistoryActionEntry<"createNode">;

												entry.position = { ...position };
											}
										}

										ctx.save();
									}}
								/>
							)}
						</Solid.Show>
					);
				}}
			</Solid.Show>
		</div>
	);
}

function ResizeHandle(props: {
	width: number;
	side: "left" | "right";
	onResize?(width: number): void;
	onResizeEnd?(width: number): void;
}) {
	return (
		<div class="relative w-px bg-neutral-700">
			<div
				class="cursor-ew-resize absolute inset-y-0 -inset-x-1 z-10"
				onMouseDown={(e) => {
					e.stopPropagation();

					if (e.button !== 0) return;

					const startX = e.clientX;
					const startWidth = props.width;

					Solid.createRoot((dispose) => {
						let currentWidth = startWidth;

						Solid.onCleanup(() => props.onResizeEnd?.(currentWidth));

						createEventListenerMap(window, {
							mouseup: dispose,
							mousemove: (e) => {
								currentWidth =
									startWidth +
									(e.clientX - startX) * (props.side === "right" ? 1 : -1);

								props.onResize?.(currentWidth);
							},
						});
					});
				}}
			/>
		</div>
	);
}

function createKeydownShortcuts(
	currentGraph: Solid.Accessor<CurrentGraph | undefined>,
	hoveredGraph: Solid.Accessor<CurrentGraph | undefined>,
	graphBounds: GraphBounds,
) {
	const ctx = useInterfaceContext();
	const mouse = createMousePosition(window);

	createEventListener(window, "keydown", async (e) => {
		const { core } = ctx;
		const { project } = core;

		switch (e.code) {
			case "KeyC": {
				if (!isCtrlEvent(e)) return;
				const graph = currentGraph();
				if (!graph?.state) return;

				const clipboardItem = {
					type: "selection",
					origin: [Number.NaN, Number.NaN],
					nodes: [] as Array<v.InferInput<typeof serde.Node>>,
					commentBoxes: [] as Array<v.InferInput<typeof serde.CommentBox>>,
					connections: [] as Array<v.InferInput<typeof serde.Connection>>,
				} satisfies Extract<
					v.InferInput<typeof ClipboardItem>,
					{ type: "selection" }
				>;

				const includedNodes = new Set<Node>();

				for (const item of graph.state.selectedItemIds) {
					let itemPosition: XY;

					if (item.type === "node") {
						const node = graph.model.nodes.get(item.id);
						if (!node || includedNodes.has(node)) continue;
						includedNodes.add(node);

						itemPosition = node.state.position;

						clipboardItem.nodes.push(serializeNode(node));
					} else {
						const box = graph.model.commentBoxes.get(item.id);
						if (!box) break;

						itemPosition = box.position;

						clipboardItem.commentBoxes.push(serializeCommentBox(box));

						const nodes = getNodesInRect(
							box.graph.nodes.values(),
							new DOMRect(
								box.position.x,
								box.position.y,
								box.size.x,
								box.size.y,
							),
							(node) => ctx.nodeSizes.get(node),
						);

						for (const node of nodes) {
							if (includedNodes.has(node)) continue;
							includedNodes.add(node);

							clipboardItem.nodes.push(serializeNode(node));
						}
					}

					if (
						Number.isNaN(clipboardItem.origin[0]) ||
						clipboardItem.origin[0] > itemPosition.x
					)
						clipboardItem.origin[0] = itemPosition.x;
					if (
						Number.isNaN(clipboardItem.origin[1]) ||
						clipboardItem.origin[1] > itemPosition.y
					)
						clipboardItem.origin[1] = itemPosition.y;
				}

				clipboardItem.connections = serializeConnections(includedNodes);

				writeClipboardItemToClipboard(clipboardItem);

				toast(
					`${
						clipboardItem.nodes.length + clipboardItem.commentBoxes.length
					} items copied to clipboard`,
				);

				break;
			}
			case "KeyV": {
				if (!isCtrlEvent(e)) return;

				let item = deserializeClipboardItem(await readFromClipboard());

				switch (item.type) {
					case "node": {
						item = {
							type: "selection",
							origin: item.node.position,
							nodes: [item.node],
							commentBoxes: [],
							connections: [],
						};

						break;
					}
					case "commentBox": {
						item = {
							type: "selection",
							origin: item.commentBox.position,
							nodes: item.nodes,
							commentBoxes: [item.commentBox],
							connections: item.connections,
						};

						break;
					}
					default:
						break;
				}

				switch (item.type) {
					case "selection": {
						const graph = hoveredGraph();
						if (!graph) return;

						const { model, state } = graph;

						const mousePosition = toGraphSpace(
							{ x: mouse.x - 10, y: mouse.y - 10 },
							graphBounds,
							state,
						);

						const nodeIdMap = new Map<number, number>();

						Solid.batch(() => {
							for (const nodeData of item.nodes) {
								const id = model.generateId();
								nodeIdMap.set(nodeData.id, id);
								nodeData.id = id;
								nodeData.position = {
									x: mousePosition.x + nodeData.position.x - item.origin.x,
									y: mousePosition.y + nodeData.position.y - item.origin.y,
								};
								const node = deserializeNode(model, nodeData);
								if (!node) throw new Error("Failed to deserialize node");

								model.nodes.set(node.id, node);
							}

							for (const box of item.commentBoxes) {
								box.id = model.generateId();
								box.position = {
									x: mousePosition.x + box.position.x - item.origin.x,
									y: mousePosition.y + box.position.y - item.origin.y,
								};
								const commentBox = deserializeCommentBox(model, box);
								if (!commentBox)
									throw new Error("Failed to deserialize comment box");

								model.commentBoxes.set(commentBox.id, commentBox);
							}

							deserializeConnections(
								item.connections,
								model.connections,
								nodeIdMap,
							);
						});

						break;
					}
					case "graph": {
						item.graph.id = project.generateGraphId();
						const graph = deserializeGraph(project, item.graph);
						if (!graph) throw new Error("Failed to deserialize graph");
						core.project.graphs.set(graph.id, graph);
						break;
					}
					case "project": {
						const project = deserializeProject(core, item.project);
						if (!project) throw new Error("Failed to deserialize project");
						core.project = project;
						break;
					}
				}

				break;
			}
			case "KeyK": {
				if (!(isCtrlEvent(e) && e.shiftKey)) return;

				const state = ctx.state;

				if (
					state.status === "schemaMenuOpen" &&
					state.position.x === mouse.x &&
					state.position.y === mouse.y
				)
					ctx.setState({ status: "idle" });
				else {
					const graph = currentGraph();
					if (!graph) return;

					ctx.setState({
						status: "schemaMenuOpen",
						graph: graph.state,
						position: { x: mouse.x, y: mouse.y },
					});
				}

				e.stopPropagation();

				break;
			}
			case "KeyB": {
				if (!isCtrlEvent(e)) return;

				ctx.leftSidebar.setState((s) => ({ open: !s.open }));

				break;
			}
			case "KeyE": {
				if (!isCtrlEvent(e)) return;

				ctx.rightSidebar.setState((s) => ({ open: !s.open }));

				break;
			}
			case "KeyZ": {
				if (!isCtrlEvent(e)) return;

				if (e.shiftKey) ctx.redo();
				else ctx.undo();

				break;
			}
			case "ArrowLeft":
			case "ArrowRight": {
				if (
					(ctx.environment === "browser" &&
						(e.metaKey || (e.shiftKey && e.ctrlKey))) ||
					(ctx.environment === "custom" &&
						!(e.metaKey || (e.shiftKey && e.altKey)))
				) {
					if (e.code === "ArrowLeft")
						ctx.setCurrentGraphIndex((i) => Math.max(i - 1, 0));
					else
						ctx.setCurrentGraphIndex((i) =>
							Math.min(i + 1, ctx.graphStates.length - 1),
						);
				} else {
					const graph = currentGraph();
					if (!graph || graph.state.selectedItemIds.length < 1) return;

					const { model } = graph;
					const { selectedItemIds } = graph.state;

					const directionMultiplier = e.code === "ArrowLeft" ? -1 : 1;

					const items: Array<GraphItemPositionInput> = [];

					for (const selectedItemId of selectedItemIds) {
						if (selectedItemId.type === "node") {
							const node = model.nodes.get(selectedItemId.id);
							if (!node) break;
							const position = node.state.position;

							items.push({
								itemId: selectedItemId.id,
								itemVariant: "node",
								position: {
									x:
										position.x +
										GRID_SIZE *
											(e.shiftKey ? SHIFT_MULTIPLIER : 1) *
											directionMultiplier,
									y: position.y,
								},
								from: { ...position },
							});
						} else if (selectedItemId.type === "commentBox") {
							const box = model.commentBoxes.get(selectedItemId.id);
							if (!box) break;

							const position = box.position;

							items.push({
								itemId: selectedItemId.id,
								itemVariant: "commentBox",
								position: {
									x:
										position.x +
										GRID_SIZE *
											(e.shiftKey ? SHIFT_MULTIPLIER : 1) *
											directionMultiplier,
									y: position.y,
								},
								from: { ...position },
							});
						}
					}

					ctx.execute("setGraphItemPositions", { graphId: model.id, items });
				}
				break;
			}
			case "ArrowUp":
			case "ArrowDown": {
				const graph = currentGraph();
				if (!graph || graph.state.selectedItemIds.length < 1) return;

				const { model } = graph;
				const { selectedItemIds } = graph.state;

				const directionMultiplier = e.code === "ArrowUp" ? -1 : 1;

				const delta =
					GRID_SIZE * (e.shiftKey ? SHIFT_MULTIPLIER : 1) * directionMultiplier;

				const items: Array<GraphItemPositionInput> = [];

				for (const selectedItemId of selectedItemIds) {
					if (selectedItemId.type === "node") {
						const node = model.nodes.get(selectedItemId.id);
						if (!node) break;
						const position = node.state.position;

						items.push({
							itemId: selectedItemId.id,
							itemVariant: "node",
							position: {
								x: position.x,
								y: position.y + delta,
							},
							from: { ...position },
						});
					} else if (selectedItemId.type === "commentBox") {
						const box = model.commentBoxes.get(selectedItemId.id);
						if (!box) break;

						const position = box.position;

						items.push({
							itemId: selectedItemId.id,
							itemVariant: "commentBox",
							position: {
								x: position.x,
								y: position.y + delta,
							},
							from: { ...position },
						});
					}
				}

				ctx.execute("setGraphItemPositions", { graphId: model.id, items });

				break;
			}
			case "Backspace":
			case "Delete": {
				const graph = currentGraph();
				if (!graph || graph.state.selectedItemIds.length < 1) return;

				const { model } = graph;
				const { selectedItemIds } = graph.state;

				const items: Array<{ type: "node" | "commentBox"; id: number }> = [];

				for (const selectedItemId of selectedItemIds) {
					if (selectedItemId.type === "node")
						items.push({ type: "node", id: selectedItemId.id });
					else if (selectedItemId.type === "commentBox") {
						const box = model.commentBoxes.get(selectedItemId.id);
						if (!box) break;

						items.push({ type: "commentBox", id: selectedItemId.id });

						if (!(e.ctrlKey || e.metaKey)) {
							const nodes = getNodesInRect(
								model.nodes.values(),
								new DOMRect(
									box.position.x,
									box.position.y,
									box.size.x,
									box.size.y,
								),
								(node) => ctx.nodeSizes.get(node),
							);

							for (const node of nodes) {
								items.push({ type: "node", id: node.id });
							}
						}
					}
				}

				if (items.length > 0)
					ctx.execute("deleteGraphSelection", { graphId: model.id, items });

				break;
			}
			default: {
				return;
			}
		}

		e.stopPropagation();
		e.preventDefault();
	});
}
