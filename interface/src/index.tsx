import { Tabs } from "@kobalte/core";
import {
	CommentBox,
	type Core,
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	Graph as GraphModel,
	Node,
	type Node as NodeModel,
	type Pin,
	Project,
	ScopeInput,
	ScopeOutput,
	type Size,
	type XY,
	deserializeConnections,
	pinIsOutput,
} from "@macrograph/runtime";
import { createElementBounds } from "@solid-primitives/bounds";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { createMousePosition } from "@solid-primitives/mouse";
import { makePersisted } from "@solid-primitives/storage";
import "@total-typescript/ts-reset";
import * as Solid from "solid-js";
import { createStore, produce } from "solid-js/store";

export { CoreProvider } from "./contexts";
import {
	commentBoxToClipboardItem,
	deserializeClipboardItem,
	nodeToClipboardItem,
	readFromClipboard,
	writeClipboardItemToClipboard,
} from "@macrograph/clipboard";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import * as Sidebars from "./Sidebar";
import { UIStoreProvider, createUIStore } from "./UIStore";
import { Graph } from "./components/Graph";
import {
	type GraphState,
	createGraphState,
	toGraphSpace,
} from "./components/Graph/Context";
import { SchemaMenu } from "./components/SchemaMenu";
import { MIN_WIDTH, Sidebar } from "./components/Sidebar";
import { InterfaceContextProvider, useInterfaceContext } from "./context";
import { CoreProvider } from "./contexts";
import "./global.css";
export { useCore } from "./contexts";

export * from "./platform";
export * from "./ConnectionsDialog";

export type GraphBounds = XY & {
	width: number;
	height: number;
};

const queryClient = new QueryClient();

export function Interface(props: {
	core: Core;
	environment: "custom" | "browser";
}) {
	return (
		<InterfaceContextProvider>
			<QueryClientProvider client={queryClient}>
				<ProjectInterface
					core={props.core}
					project={props.core.project}
					environment={props.environment}
				/>
			</QueryClientProvider>
		</InterfaceContextProvider>
	);
}

function ProjectInterface(props: {
	core: Core;
	project: Project;
	environment: "custom" | "browser";
}) {
	const UI = createUIStore();
	const ctx = useInterfaceContext();

	const [rootRef, setRootRef] = Solid.createSignal<
		HTMLDivElement | undefined
	>();
	const rootBounds = createElementBounds(rootRef);

	const mouse = createMousePosition(window);

	const leftSidebar = createSidebarState("left-sidebar");
	const rightSidebar = createSidebarState("right-sidebar");

	const [graphBounds, setGraphBounds] = createStore<GraphBounds>({
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	});

	const [graphStates, setGraphStates] = makePersisted(
		createStore<GraphState[]>([]),
		{ name: "graph-states" },
	);
	const [currentGraphIndex, setCurrentGraphIndex] = makePersisted(
		Solid.createSignal<number>(0),
		{ name: "current-graph-index" },
	);

	const nodeSizes = new WeakMap<NodeModel, Size>();
	const pinPositions = new ReactiveWeakMap<Pin, XY>();

	const currentGraph = Solid.createMemo(() => {
		const index = currentGraphIndex();
		if (index === null) return;

		const state = graphStates[index];
		if (!state) return;

		const model = props.core.project.graphs.get(state.id);
		if (!model) return;

		return {
			model,
			state,
			index,
		};
	});

	// will account for multi-pane in future
	const [hoveredPane, setHoveredPane] = Solid.createSignal<null | true>(null);

	const hoveredGraph = Solid.createMemo(() => {
		if (hoveredPane()) return currentGraph();
	});

	const firstGraph = props.project.graphs.values().next().value;
	if (graphStates.length === 0 && firstGraph)
		setGraphStates([createGraphState(firstGraph)]);

	// reduces the current graph index if the current graph
	// is the end graph and it gets deleted
	Solid.createEffect(() => {
		if (currentGraph()) return;
		setCurrentGraphIndex(Math.max(0, currentGraphIndex() - 1));
	});

	// removes graph states if graphs are deleted
	Solid.createEffect(() => {
		for (const state of graphStates) {
			const graph = props.core.project.graphs.get(state.id);
			if (!graph) setGraphStates(graphStates.filter((s) => s.id !== state.id));
		}
	});

	createEventListener(window, "keydown", async (e) => {
		const { core } = props;
		const { project } = core;

		switch (e.code) {
			case "KeyC": {
				if (!e.metaKey && !e.ctrlKey) return;
				const graph = currentGraph();
				const selectedItemId = graph?.state?.selectedItemId;
				if (!selectedItemId) return;

				if (selectedItemId.type === "node") {
					const node = graph.model.nodes.get(selectedItemId.id);
					if (!node) break;

					await writeClipboardItemToClipboard(nodeToClipboardItem(node));
				} else if (selectedItemId.type === "commentBox") {
					const box = graph.model.commentBoxes.get(selectedItemId.id);
					if (!box) break;

					await writeClipboardItemToClipboard(
						commentBoxToClipboardItem(box, (node) => nodeSizes.get(node)),
					);
				}

				// TODO: toast

				break;
			}
			case "KeyV": {
				if (!e.metaKey && !e.ctrlKey) return;

				const item = deserializeClipboardItem(await readFromClipboard());

				switch (item.type) {
					case "node": {
						const graph = hoveredGraph();
						if (!graph) return;

						const { model, state } = graph;

						item.node.id = model.generateId();
						const node = Node.deserialize(model, {
							...item.node,
							position: toGraphSpace(
								{ x: mouse.x - 10, y: mouse.y - 10 },
								graphBounds,
								state,
							),
						});
						if (!node) throw new Error("Failed to deserialize node");

						model.nodes.set(item.node.id, node);

						break;
					}
					case "commentBox": {
						const graph = hoveredGraph();
						if (!graph) return;

						const { model, state } = graph;

						item.commentBox.id = model.generateId();
						const commentBox = CommentBox.deserialize(model, {
							...item.commentBox,
							position: toGraphSpace(
								{ x: mouse.x - 10, y: mouse.y - 10 },
								graphBounds,
								state,
							),
						});
						if (!commentBox)
							throw new Error("Failed to deserialize comment box");

						model.commentBoxes.set(item.commentBox.id, commentBox);

						const nodeIdMap = new Map<number, number>();

						Solid.batch(() => {
							for (const nodeJson of item.nodes) {
								const id = model.generateId();
								nodeIdMap.set(nodeJson.id, id);
								nodeJson.id = id;
								const node = Node.deserialize(model, {
									...nodeJson,
									position: {
										x:
											commentBox.position.x +
											nodeJson.position.x -
											item.commentBox.position.x,
										y:
											commentBox.position.y +
											nodeJson.position.y -
											item.commentBox.position.y,
									},
								});

								if (!node) throw new Error("Failed to deserialize node");

								model.nodes.set(node.id, node);
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
						const graph = GraphModel.deserialize(project, item.graph);
						if (!graph) throw new Error("Failed to deserialize graph");
						core.project.graphs.set(graph.id, graph);
						break;
					}
					case "project": {
						const project = await Project.deserialize(core, item.project);
						if (!project) throw new Error("Failed to deserialize project");
						core.project = project;
						break;
					}
				}

				break;
			}
			case "KeyK": {
				if (!((e.metaKey || e.ctrlKey) && e.shiftKey)) return;

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
				if (!(e.metaKey || e.ctrlKey)) return;

				leftSidebar.setState((s) => ({ open: !s.open }));

				break;
			}
			case "KeyE": {
				if (!(e.metaKey || e.ctrlKey)) return;

				rightSidebar.setState((s) => ({ open: !s.open }));

				break;
			}
			case "ArrowLeft":
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
			case "ArrowRight": {
				if (
					props.environment === "browser" &&
					!(e.metaKey || (e.shiftKey && e.ctrlKey))
				)
					return;
				if (
					props.environment === "custom" &&
					!(e.metaKey || (e.shiftKey && e.altKey))
				)
					return;

				if (e.code === "ArrowLeft")
					setCurrentGraphIndex((i) => Math.max(i - 1, 0));
				else
					setCurrentGraphIndex((i) => Math.min(i + 1, graphStates.length - 1));
			}
			default: {
				return;
			}
		}

		e.stopPropagation();
		e.preventDefault();
	});

	const [stuff, setStuff] = Solid.createSignal<{ pin: Pin; mousePos: XY }>();

	return (
		<CoreProvider core={props.core} rootRef={rootRef}>
			<UIStoreProvider store={UI}>
				<div
					ref={setRootRef}
					class="relative w-full h-full flex flex-row select-none bg-neutral-800 text-white"
					onContextMenu={(e) => {
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{/* {((_) => {
            const GraphSection = createSection({
              title: "Graphs",
              source: () => [
                {
                  title: "Create New Graph",
                  run(control: Control) {
                    const graph = props.core.project.createGraph();

                    const currentIndex = graphStates.findIndex(
                      (s) => s.id === graph.id
                    );

                    if (currentIndex === -1) {
                      setGraphStates((s) => [...s, createGraphState(graph)]);
                      setCurrentGraphIndex(graphStates.length - 1);
                    } else setCurrentGraphIndex(currentIndex);

                    control.hide();
                  },
                },
                ...[...props.core.project.graphs.values()].map((graph) => ({
                  title: graph.name,
                  run(control: Control) {
                    const currentIndex = graphStates.findIndex(
                      (s) => s.id === graph.id
                    );

                    if (currentIndex === -1) {
                      setGraphStates((s) => [...s, createGraphState(graph)]);
                      setCurrentGraphIndex(graphStates.length - 1);
                    } else setCurrentGraphIndex(currentIndex);

                    control.hide();
                  },
                })),
              ],
            });

            const CustomEventsSection = createSection({
              title: "Custom Events",
              source: Solid.createMemo(() =>
                [...props.core.project.customEvents.values()].map(
                  (customEvent) => ({
                    title: customEvent.name,
                    run() {},
                  })
                )
              ),
            });

            return <CommandDialog sections={[GraphSection]} />;
          })()} */}

					<Solid.Show when={leftSidebar.state.open}>
						<Sidebar
							width={Math.max(leftSidebar.state.width, MIN_WIDTH)}
							name="Project"
							initialValue={["Graphs"]}
						>
							<Sidebars.Project
								project={props.core.project}
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
					</Solid.Show>

					<div class="flex-1 flex divide-y divide-neutral-700 flex-col h-full justify-center items-center text-white overflow-x-hidden">
						<Solid.Show when={currentGraph() !== undefined}>
							<Tabs.Root
								class="overflow-x-auto w-full scrollbar scrollbar-none"
								value={currentGraphIndex().toString()}
							>
								<Tabs.List class="h-8 flex flex-row relative text-sm">
									<Tabs.Indicator class="absolute inset-0 transition-transform">
										<div class="bg-white/20 w-full h-full" />
									</Tabs.Indicator>
									<Solid.For
										each={graphStates
											.map((state) => {
												const graph = props.core.project.graphs.get(state.id);
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
								<span class="text-neutral-400 font-medium">
									No graph selected
								</span>
							}
						>
							{(graph) => (
								<Graph
									graph={graph().model}
									state={graph().state}
									nodeSizes={nodeSizes}
									pinPositions={pinPositions}
									onMouseEnter={() => setHoveredPane(true)}
									onMouseMove={() => setHoveredPane(true)}
									onMouseLeave={() => setHoveredPane(null)}
									onItemSelected={(id) => {
										setGraphStates(graph().index, { selectedItemId: id });
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
													selectedItemId: null,
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
											<Sidebars.Graph graph={graph().model} />
										</Sidebar>
									}
								>
									<Solid.Match
										when={(() => {
											const {
												model,
												state: { selectedItemId },
											} = graph();

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
												state: { selectedItemId },
											} = graph();

											if (
												!selectedItemId ||
												selectedItemId.type !== "commentBox"
											)
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
								return props.core.project.graphs.get(data().graph.id);
							});

							Solid.createEffect(() => {
								if (!graph()) ctx.setState({ status: "idle" });
								setStuff();
							});

							const graphPosition = () =>
								toGraphSpace(data().position, graphBounds, data().graph);

							return (
								<Solid.Show when={graph()}>
									{(graph) => (
										<SchemaMenu
											suggestion={data().suggestion}
											graph={data().graph}
											position={{
												x: data().position.x - (rootBounds?.left ?? 0),
												y: data().position.y - (rootBounds?.top ?? 0),
											}}
											onCreateCommentBox={() => {
												Solid.batch(() => {
													graph().createCommentBox({
														position: graphPosition(),
														size: { x: 400, y: 200 },
														text: "Comment",
													});

													ctx.setState({ status: "idle" });
												});
											}}
											onSchemaClicked={(schema, targetSuggestion) => {
												const graphState = data().graph;

												const pin = Solid.batch(() => {
													const node = graph().createNode({
														schema,
														position: graphPosition(),
													});

													const { suggestion: sourceSuggestion } = data();

													if (ctx.state.status === "connectionAssignMode") {
														ctx.setState({
															...ctx.state,
															state: { status: "active" },
														});
													} else {
														ctx.setState({ status: "idle" });
													}

													if (sourceSuggestion && targetSuggestion) {
														if (
															sourceSuggestion.pin instanceof ExecOutput ||
															sourceSuggestion.pin instanceof DataOutput ||
															sourceSuggestion.pin instanceof ScopeOutput
														) {
															const input =
																node.state.inputs[targetSuggestion.pin];
															if (input) {
																graph().connectPins(
																	sourceSuggestion.pin,
																	input,
																);
																return input;
															}
														} else if (
															sourceSuggestion.pin instanceof ExecInput ||
															sourceSuggestion.pin instanceof DataInput ||
															sourceSuggestion.pin instanceof ScopeInput
														) {
															const output =
																node.state.outputs[targetSuggestion.pin];
															if (output) {
																graph().connectPins(
																	output,
																	sourceSuggestion.pin,
																);
																return output;
															}
														}
													}
												});

												if (pin) {
													const _pinPosition = pinPositions.get(pin);
													const nodeSize = nodeSizes.get(pin.node);
													if (!_pinPosition || !nodeSize) return;

													const pinPosition = toGraphSpace(
														_pinPosition,
														graphBounds,
														graphState,
													);

													const nodeX = pin.node.state.position.x;

													const xDelta = !pinIsOutput(pin)
														? nodeX - pinPosition.x
														: -nodeSize.width +
															(nodeX + nodeSize.width - pinPosition.x);

													pin.node.setPosition(
														{
															x: pin.node.state.position.x + xDelta,
															y:
																pin.node.state.position.y -
																(pinPosition.y - pin.node.state.position.y),
														},
														true,
													);
												}
											}}
										/>
									)}
								</Solid.Show>
							);
						}}
					</Solid.Show>
				</div>
			</UIStoreProvider>
		</CoreProvider>
	);
}

function createSidebarState(name: string) {
	const [state, setState] = makePersisted(
		createStore({
			width: MIN_WIDTH,
			open: true,
		}),
		{ name },
	);

	// Solid.createEffect(
	//   Solid.on(
	//     () => state.width,
	//     (width) => {
	//       if (width < MIN_WIDTH * (1 - SNAP_CLOSE_PCT)) setState({ open: false });
	//       else if (width > MIN_WIDTH * (1 - SNAP_CLOSE_PCT))
	//         setState({ open: true });
	//     }
	//   )
	// );

	return { state, setState };
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
