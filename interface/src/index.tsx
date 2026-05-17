import {
	type ClipboardItem,
	deserializeClipboardItem,
	serializeClipboardItem,
	serializeConnections,
} from "@macrograph/clipboard";
import {
	type Core,
	type Graph as GraphModel,
	type Node,
	type XY,
	getNodesInRect,
	pinIsOutput,
} from "@macrograph/runtime";
import {
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
import type { Accessor } from "solid-js";
import * as Solid from "solid-js";
import { createStore, produce } from "solid-js/store";
import { toast } from "solid-sonner";
import type * as v from "valibot";
import clsx from "clsx";
import { isMobile } from "@solid-primitives/platform";
import { Dynamic } from "solid-js/web";

import * as Sidebars from "./Sidebar";
import type { CreateNodeInput, GraphItemPositionInput } from "./actions";
import { Graph } from "./components/Graph";
import {
	makeGraphState,
	type GraphViewState,
	type SelectedItemID,
	type TabState,
	toGraphSpace,
	toScreenSpace,
} from "./components/Graph/Context";
import { GRID_SIZE, SHIFT_MULTIPLIER } from "./components/Graph/util";
import { NodeSearchDialog } from "./components/NodeSearchDialog";
import { SchemaMenu } from "./components/SchemaMenu";
import { MIN_WIDTH, Sidebar } from "./components/Sidebar";
import {
	type Environment,
	type GraphBounds,
	type TabListState,
	InterfaceContextProvider,
	useInterfaceContext,
} from "./context";
import "./global.css";
import { isCtrlEvent } from "./util";
import { PlatformContext, usePlatform } from "./platform";

export * from "./platform";
export * from "./ConnectionsDialog";
export * from "./ConfigDialog";
export {
	exportInvocationLogForGraphs,
	importInvocationLogFromProject,
} from "./nodeInvocationLog";
export type { RemoteHistoryWireItem, WireGraphPositionsEphemeral, RemoteCursor, RemotePinDrag, RemoteSelectionBox } from "./remoteHistorySync";
export {
	applyRemoteHistoryItems,
	applySetGraphItemPositionsPerform,
	parseGraphPositionsEphemeralMessage,
	parseCursorMessage,
	parseNodeExecuteMessage,
	runAsRemoteHistoryInbound,
	stringifyGraphPositionsEphemeralWire,
	stringifyCursorWire,
	stringifyNodeExecuteWire,
	stringifyRemoteHistoryWirePayload,
	toWireJsonSerializable,
	getRemoteCursors,
	updateRemoteCursor,
	removeRemoteCursor,
	setCursorBroadcastFn,
	getUserList,
	setUserList,
	getFollowUserId,
	setFollowUserId,
	getRemotePinDrags,
	updateRemotePinDrag,
	removeRemotePinDrag,
	getRemoteSelectionBoxes,
	updateRemoteSelectionBox,
	removeRemoteSelectionBox,
	parsePinDragMessage,
	parseSelectionBoxMessage,
	broadcastPinDrag,
	broadcastSelectionBox,
	setPinDragBroadcastFn,
	setSelectionBoxBroadcastFn,
} from "./remoteHistorySync";

import type { RemoteHistoryWireItem, WireGraphPositionsEphemeral } from "./remoteHistorySync";

const queryClient = new QueryClient();

export function Interface(props: {
	core: Core;
	environment: Environment;
	mosaicWorkspaceKey?: Accessor<string | null | undefined>;
	broadcastHistoryCommit?: (items: RemoteHistoryWireItem[]) => void;
	broadcastGraphPositionsLive?: (payload: WireGraphPositionsEphemeral) => void;
	onGraphLivePointerSession?: (active: boolean) => void;
	broadcastCursorPosition?: (payload: { graphId: number; position: { x: number; y: number } }) => void;
}) {
	return (
		<InterfaceContextProvider
			core={props.core}
			environment={props.environment}
			mosaicWorkspaceKey={props.mosaicWorkspaceKey}
			broadcastHistoryCommit={props.broadcastHistoryCommit}
			broadcastGraphPositionsLive={props.broadcastGraphPositionsLive}
			onGraphLivePointerSession={props.onGraphLivePointerSession}
			broadcastCursorPosition={props.broadcastCursorPosition}
		>
			<QueryClientProvider client={queryClient}>
				<ProjectInterface />
			</QueryClientProvider>
		</InterfaceContextProvider>
	);
}

type CurrentGraph = {
	model: GraphModel;
	state: GraphViewState;
	size: GraphBounds;
};

// type MosaicItem = {
//   type: "graph";
//   data: GraphState;
// };

// function createMosaic<TItem>() {
//   type State<TItem> = {
//     type: "container";
//     direction: "vertical" | "horizontal";
//     items: Array<State<TItem> | { type: "item"; item: TItem }>;
//   };

//   const mosaic = createMutable<State<TItem>>({
//     type: "container",
//     direction: "horizontal",
//     items: [],
//   });

//   return mosaic;
// }

function ProjectInterface() {
	const platform = usePlatform();
	const ctx = useInterfaceContext();
	const {
		leftSidebar,
		rightSidebar,
		// graphStates,
		// setGraphStates,
		mosaicState,
		setMosaicState,
	} = useInterfaceContext();

	const currentGraph = Solid.createMemo(() => {
		const group = mosaicState.groups[mosaicState.focusedIndex];

		const tab = group?.tabs[group?.selectedIndex ?? 0];
		if (!tab || (tab.type !== "graph" && tab.type !== "function" && tab.type !== "queue")) return;

		const model = ctx.core.project.graphs.get(tab.graphId);
		if (!model) return;

		return { model, state: tab } as unknown as CurrentGraph;
	});

	// will account for multi-pane in future
	const [hoveredPane, setHoveredPane] = Solid.createSignal<null | boolean>(
		null,
	);

	const hoveredGraph = Solid.createMemo(() => {
		if (hoveredPane()) return currentGraph();
	});

	createKeydownShortcuts(currentGraph, hoveredGraph, ctx.graphBounds);

	// const firstGraph = ctx.core.project.graphs.values().next().value;
	// if (graphStates.length === 0 && firstGraph)
	//   setGraphStates([makeGraphState(firstGraph)]);

	const [rootRef, setRootRef] = Solid.createSignal<
		HTMLDivElement | undefined
	>();
	const rootBounds = createElementBounds(rootRef);

	const leftSidebarWidth = () =>
		ctx.leftSidebar.state.open
			? Math.max(ctx.leftSidebar.state.width, MIN_WIDTH)
			: 0;

	const rightSidebarWidth = () =>
		ctx.rightSidebar.state.open
			? Math.max(ctx.rightSidebar.state.width, MIN_WIDTH)
			: 0;

	const isTouchDevice = isMobile || navigator.maxTouchPoints > 0;

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
				<div class="flex flex-row">
					<Sidebar
						width={leftSidebarWidth()}
						name="Project"
						initialValue={["Graphs"]}
					>
						<Sidebars.Project
							currentGraph={currentGraph()?.model}
							project={ctx.core.project}
							onGraphClicked={(graph) => ctx.selectGraph(graph)}
							onFunctionClicked={(fn) => ctx.selectFunction(fn)}
							onQueueClicked={(queue) => ctx.selectQueue(queue)}
							onPackageClicked={(pkg) => ctx.selectPackage(pkg)}
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
			<Solid.Show when={isTouchDevice}>
				<button
					type="button"
					class="mt-auto mb-auto rounded-r border-y border-r border-neutral-700 bg-neutral-800 h-12 w-4 flex items-center justify-center shadow shrink-0"
					onClick={() => {
						ctx.leftSidebar.setState((s) => ({ open: !s.open }));
					}}
				>
					<IconTablerChevronRight
						class={clsx("size-4", ctx.leftSidebar.state.open && "rotate-180")}
					/>
				</button>
			</Solid.Show>

			<div class="flex-1 flex divide-x divide-neutral-700 flex-row h-full justify-center items-center text-white overflow-x-hidden min-w-0">
				<Solid.For each={mosaicState.groups}>
					{(mosaicItem, i) => (
						<GraphTabList
							focused={mosaicState.focusedIndex === i()}
							state={mosaicItem}
							onTabClose={(index) => {
								setMosaicState(
									"groups",
									mosaicState.focusedIndex,
									produce((state) => {
										state.tabs.splice(index, 1);
										state.selectedIndex = Math.min(
											state.selectedIndex,
											state.tabs.length - 1,
										);
									}),
								);
							}}
							onSelectedChanged={(i) => {
								setMosaicState(
									"groups",
									mosaicState.focusedIndex,
									"selectedIndex",
									i,
								);
							}}
							onFocus={() => {
								ctx.setMosaicState("focusedIndex", i());
							}}
							onClose={() => {
								ctx.setMosaicState(
									"groups",
									produce((groups) => {
										groups.splice(i(), 1);
									}),
								);
							}}
							setHoveredPane={setHoveredPane}
						/>
					)}
				</Solid.For>
			</div>

			<Solid.Show when={isTouchDevice}>
				<button
					type="button"
					class="mt-auto mb-auto rounded-l border-y border-l border-neutral-700 bg-neutral-800 h-12 w-4 flex items-center justify-center shadow shrink-0"
					onClick={() => {
						ctx.rightSidebar.setState((s) => ({ open: !s.open }));
					}}
				>
					<IconTablerChevronRight
						class={clsx(
							"size-4",
							!ctx.rightSidebar.state.open && "rotate-180",
						)}
					/>
				</button>
			</Solid.Show>
			<Solid.Show when={rightSidebar.state.open}>
				<div class="flex flex-row">
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
										width={rightSidebarWidth()}
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
				</div>
			</Solid.Show>

			<NodeSearchDialog />

			<Solid.Show
				when={(() => {
					const graph = currentGraph();
					if (!graph) return;

					const state = ctx.state;

					return (
						(state.status === "schemaMenuOpen" && {
							...state,
							graph,
							suggestion: undefined,
						}) ||
						(state.status === "connectionAssignMode" &&
							state.state.status === "schemaMenuOpen" && {
								...state.state,
								graph,
								suggestion: { pin: state.pin },
							}) ||
						(state.status === "pinDragMode" &&
							state.state.status === "schemaMenuOpen" && {
								...state.state,
								graph,
								suggestion: { pin: state.pin },
							})
					);
				})()}
			>
				{(data) => {
					const graph = currentGraph;
					// Solid.createMemo(() => {
					//   return ctx.core.project.graphs.get(data().graph.id);
					// });

					Solid.createEffect(() => {
						if (!graph()) ctx.setState({ status: "idle" });
					});

					const graphPosition = () =>
						toGraphSpace(data().position, ctx.graphBounds, data().graph.state);

					return (
						<Solid.Show when={graph()}>
							{(graph) => (
								<SchemaMenu
									suggestion={data().suggestion}
									graphModel={data().graph.model}
									position={{
										x: data().position.x - (rootBounds.left ?? 0),
										y: data().position.y - (rootBounds.top ?? 0),
									}}
									onClose={() => {
										ctx.setState({ status: "idle" });
									}}
									onCreateCommentBox={() => {
										const graph = data().graph.model;
										Solid.batch(() => {
											const box = ctx.execute("createCommentBox", {
												graphId: graph.id,
												position: graphPosition(),
											});
											if (!box) return;

											const [_, set] = createStore(data().graph.state);
											set("selectedItemIds", [
												{ type: "commentBox", id: box.id },
											]);

											ctx.setState({ status: "idle" });
										});
									}}
									onPasteClipboard={async () => {
										const item = deserializeClipboardItem(
											await platform.clipboard.readText(),
										);

										if (item.type === "selection") {
											const graph = currentGraph();
											if (!graph) return;

											const { model, state } = graph;

											const mousePosition = toGraphSpace(
												{
													x: data().position.x - (rootBounds.left ?? 0),
													y: data().position.y - (rootBounds.top ?? 0) + 40,
												},
												ctx.graphBounds,
												state,
											);

											ctx.execute("pasteGraphSelection", {
												graphId: model.id,
												mousePosition,
												selection: item,
											});

											ctx.setState({ status: "idle" });
										}
									}}
									onSchemaClicked={(schema, targetSuggestion, extra) => {
										const graph = data().graph.model;
										const graphId = graph.id;
										ctx.batch(() => {
											const pin = Solid.batch(() => {
												const input: CreateNodeInput = {
													graphId,
													schema,
													position: graphPosition(),
													properties: extra?.defaultProperties,
													name: extra?.name,
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

												const [_, set] = createStore(graph.state);
												set("selectedItemIds", [{ type: "node", id: node.id }]);

												if (sourceSuggestion && targetSuggestion) {
													if (pinIsOutput(sourceSuggestion.pin))
														return node.input(targetSuggestion.pin);
													return node.output(targetSuggestion.pin);
												}
											});

											if (pin) {
												const pinPosition = ctx.pinPositions.get(pin);
												const nodeSize = ctx.itemSizes.get(pin.node);
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

												ctx.execute("setGraphItemPositions", {
													graphId,
													items: [
														{
															itemId: pin.node.id,
															itemVariant: "node",
															position,
														},
													],
												});
											}
										});
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

// document.addEventListener(
//   "touchmove",
//   (e) => {
//     e.preventDefault();
//   },
//   { passive: false },
// );

function ResizeHandle(props: {
	width: number;
	side: "left" | "right";
	onResize?(width: number): void;
	onResizeEnd?(width: number): void;
}) {
	const [dragging, setDragging] = Solid.createSignal(false);

	return (
		<div
			class={clsx(
				"relative w-px",
				dragging() ? "bg-neutral-500" : "bg-neutral-700",
			)}
		>
			<div
				ref={(ref) => {
					ref.addEventListener("touchmove", (e) => e.preventDefault(), {
						passive: false,
					});
				}}
				class="cursor-ew-resize absolute inset-y-0 -inset-x-1 z-10"
				onPointerDown={(e) => {
					e.stopPropagation();

					if (e.button !== 0) return;

					const startX = e.clientX;
					const startWidth = props.width;

					setDragging(true);

					Solid.createRoot((dispose) => {
						let currentWidth = startWidth;

						Solid.onCleanup(() => {
							setDragging(false);
							props.onResizeEnd?.(currentWidth);
						});

						createEventListenerMap(window, {
							pointerup: dispose,
							pointermove: (e) => {
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
	const platform = usePlatform();
	const ctx = useInterfaceContext();
	const mouse = createMousePosition(window);

	createEventListener(window, "keydown", async (e) => {
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
					selected: {
						nodes: [] as Array<number>,
						commentBoxes: [] as Array<number>,
					},
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
							(node) => ctx.itemSizes.get(node),
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

					if (item.type === "node") clipboardItem.selected.nodes.push(item.id);
					else clipboardItem.selected.commentBoxes.push(item.id);
				}

				clipboardItem.connections = serializeConnections(includedNodes);

				platform.clipboard.writeText(serializeClipboardItem(clipboardItem));

				toast(
					`${
						clipboardItem.nodes.length + clipboardItem.commentBoxes.length
					} items copied to clipboard`,
				);

				break;
			}
			case "KeyV": {
				if (!isCtrlEvent(e)) return;

				e.preventDefault();

				const item = deserializeClipboardItem(
					await platform.clipboard.readText(),
				);

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

						console.log({ item, mousePosition });

						ctx.execute("pasteGraphSelection", {
							graphId: model.id,
							mousePosition,
							selection: item,
						});

						break;
					}
					case "graph": {
						ctx.execute("pasteGraph", item.graph);

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
					if (e.code === "ArrowLeft") {
						// const index = ctx.currentGraphIndex();
						// if (!index) break;
						// const state = ctx.graphStates[Math.max(0, index - 1)];
						// if (!state) break;
						// ctx.setCurrentGraphId(state.id);
					} else {
						// const index = ctx.currentGraphIndex();
						// if (!index) break;
						// const state =
						//   ctx.graphStates[Math.min(index + 1, ctx.graphStates.length - 1)];
						// if (!state) break;
						// ctx.setCurrentGraphId(state.id);
					}
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
								(node) => ctx.itemSizes.get(node),
							);

							for (const node of nodes) {
								items.push({ type: "node", id: node.id });
							}
						}
					}
				}

				if (items.length > 0)
					ctx.execute("deleteGraphItems", { graphId: model.id, items });

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

function tabLabel(tab: TabState, ctx: InterfaceContext): string {
	if (tab.type === "graph") return ctx.core.project.graphs.get(tab.graphId)?.name ?? "Graph";
	if (tab.type === "function") {
		const fn = [...ctx.core.project.functions].find(([, f]) => f.id === tab.functionId)?.[1];
		return fn?.name ?? "Function";
	}
	if (tab.type === "queue") {
		const q = ctx.core.project.queues.get(tab.queueId);
		return q?.name ?? "Queue";
	}
	if (tab.type === "settings") return "Settings";
	if (tab.type === "package") return `pkg: ${tab.packageName}`;
	return "Tab";
}

function GraphTabList(props: {
	focused: boolean;
	state: TabListState;
	onSelectedChanged: (index: number) => void;
	onTabClose: (index: number) => void;
	onFocus: () => void;
	onClose: () => void;
	setHoveredPane: Solid.Setter<boolean | null>;
}) {
	const ctx = useInterfaceContext();

	const selectedTab = () => props.state.tabs[props.state.selectedIndex];

	const graphContent = () => {
		const tab = selectedTab();
		if (!tab || (tab.type !== "graph" && tab.type !== "function" && tab.type !== "queue")) return;
		const graph = ctx.core.project.graphs.get(tab.graphId);
		if (!graph) return;
		return { tab, graph };
	};

	return (
		<div
			class="flex-1 flex flex-col justify-center items-center h-full relative"
			onMouseDown={() => {
				setTimeout(() => {
					props.onFocus();
				}, 1);
			}}
		>
			<div class="overflow-x-auto w-full scrollbar scrollbar-none border-b border-neutral-700 h-8 flex flex-row text-sm">
				<Solid.For each={props.state.tabs}>
					{(tab, index) => (
						<button
							type="button"
							class={clsx(
								"py-2 px-4 flex flex-row items-center relative group shrink-0 whitespace-nowrap transition-colors",
								props.state.selectedIndex === index()
									? clsx(
										props.focused ? "bg-white/20" : "bg-white/10",
										tab.type === "function" && "text-sky-200",
										tab.type === "queue" && "text-amber-200",
										tab.type === "settings" && "text-purple-200",
										tab.type === "package" && "text-cyan-200",
									)
									: clsx(
										"hover:bg-white/5",
										tab.type === "function" && "text-sky-300",
										tab.type === "queue" && "text-amber-300",
										tab.type === "settings" && "text-purple-300",
										tab.type === "package" && "text-cyan-300",
									),
							)}
							onClick={() => props.onSelectedChanged(index())}
						>
							<span class="font-medium">{tabLabel(tab, ctx)}</span>
							<span
								class="ml-1 hover:bg-white/20 rounded-[0.125rem] opacity-0 group-hover:opacity-100 cursor-pointer"
								onClick={(e) => {
									e.stopPropagation();
									props.onTabClose(index());
								}}
							>
								<IconHeroiconsXMarkSolid
									class="size-2"
									stroke-width={1}
								/>
							</span>
						</button>
					)}
				</Solid.For>
				<div class="flex-1" />
			</div>
			{(() => {
				const tab = selectedTab();
				const graph = (tab && (tab.type === "graph" || tab.type === "function" || tab.type === "queue"))
					? ctx.core.project.graphs.get(tab.graphId)
					: undefined;

				if (tab && graph) {
					const groupIdx = ctx.mosaicState.groups.indexOf(props.state);
					const setGraphTranslate = (t: XY) => {
						if (groupIdx >= 0)
							ctx.setMosaicState("groups", groupIdx, "tabs", props.state.selectedIndex, "translate", t);
					};
					const setGraphScale = (s: number) => {
						if (groupIdx >= 0)
							ctx.setMosaicState("groups", groupIdx, "tabs", props.state.selectedIndex, "scale", s);
					};
					return (
						<Graph
							graph={graph}
							state={tab}
							onMouseEnter={() => props.setHoveredPane(true)}
							onMouseMove={() => props.setHoveredPane(true)}
							onMouseLeave={() => props.setHoveredPane(null)}
							onBoundsChange={ctx.setGraphBounds}
							onSizeChange={ctx.setGraphBounds}
							onScaleChange={setGraphScale}
							onTranslateChange={setGraphTranslate}
						/>
					);
				}

				if (tab?.type === "package") {
					const pkg = ctx.core.packages.find((p) => p.name === tab.packageName);
					return (
						<div class="flex-1 w-full flex flex-row overflow-auto bg-neutral-900">
							<div class="flex-1 overflow-y-auto p-4 text-white">
								<Solid.Suspense fallback="Loading...">
									<Solid.ErrorBoundary fallback={<span class="text-red-400">Error loading package settings</span>}>
										{pkg?.SettingsUI ? (
											<Dynamic {...(pkg as any).ctx} component={pkg.SettingsUI} />
										) : (
											<span class="text-neutral-500">Package has no settings</span>
										)}
									</Solid.ErrorBoundary>
								</Solid.Suspense>
							</div>
						</div>
					);
				}

				return (
					<>
						<Solid.Show when={ctx.mosaicState.groups.length > 1}>
							<button
								type="button"
								class={clsx(
									"absolute top-4 right-4 rounded hover:bg-white/10 transition-colors duration-50",
									props.focused ? "text-white" : "text-white/50",
								)}
								onClick={() => {
									props.onClose();
								}}
							>
								<IconBiX class="size-5" />
							</button>
						</Solid.Show>
						<span class="text-neutral-400 font-medium">No graph selected</span>
					</>
				);
			})()}
		</div>
	);
}
