import {
	type ClipboardItem,
	deserializeClipboardItem,
	serializeClipboardItem,
	serializeConnections,
} from "@macrograph/clipboard";
import {
	type Core,
	type Graph as GraphModel,
	type GraphRef,
	type Node,
	type XY,
	getNodesInRect,
	pinIsOutput,
	graphRefOf,
	graphRefsEqual,
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
import { FunctionQueuePanel } from "./components/FunctionQueuePanel";
import { Graph } from "./components/Graph";
import { MosaicLayout } from "./components/MosaicLayout";
import { SplitDropOverlay } from "./components/SplitDropOverlay";
import {
	graphRefFromTab,
	isGraphEditorTab,
	normalizeGraphEditorTab,
	makeGraphState,
	tabGraphKind,
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
	tabKey,
	useInterfaceContext,
} from "./context";
import "./global.css";
import {
	applySplitRatioAtPath,
	applyTabDrop,
	closeGroup,
	closeTabInGroup,
	collectLeafGroupIds,
	detectDropTarget,
	findMosaicGroupIdAtPoint,
	getGraphViewportBounds,
	mosaicLayoutKey,
	setMosaicWorkspaceState,
	duplicateTab,
	findGroupIndex,
	focusAdjacentLeaf,
	focusLeafByIndex,
	moveTabInGroup,
	splitFocusedGroup,
	type MosaicWorkspaceState,
} from "./mosaicLayout";
import { MosaicPaneProvider, useMosaicPane } from "./mosaicPaneContext";
import {
	endTabDragSession,
	getTabDragGhostPos,
	getTabDragSession,
	getTabDropTarget,
	startTabDragSession,
	updateTabDragGhost,
	updateTabDropTarget,
} from "./tabDragSession";
import { beginPaneResize, endPaneResize } from "./paneResizeSession";
import { isCtrlEvent, isEditingText } from "./util";
import {
	tabButtonBackground,
	tabColorForType,
	tabTintBackground,
} from "./ConfigDialog";
import { PlatformContext, usePlatform } from "./platform";

export * from "./platform";
export {
	LoadCheckerDialog,
	loadParsedProject,
	requestProjectLoadConfirmation,
} from "./LoadCheckerDialog";
export * from "./ConnectionsDialog";
export * from "./ConfigDialog";
export * from "./KeyboardShortcutsDialog";
export * from "./keyboardShortcuts";
export {
	exportInvocationLogForGraphs,
	importInvocationLogFromProject,
	readInvocationLogEntries,
} from "./nodeInvocationLog";
export {
	PROJECT_LOCAL_STORAGE_KEY,
	LEGACY_PROJECT_ROOT_KEY,
	MOSAIC_LS_PREFIX,
	ensureEditorStorageMigrated,
	loadProjectJson,
	removeShardedProjectKeys,
	saveProjectToStorage,
	saveProjectToLocalStorage,
} from "./projectStorage";
export type { RemoteHistoryWireItem, WireGraphPositionsEphemeral, WireCursorPosition, RemoteCursor, RemotePinDrag, RemoteSelectionBox } from "./remoteHistorySync";
export {
	applyRemoteHistoryItems,
	applySetGraphItemPositionsPerform,
	setRemoteSyncDebugLogger,
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
	broadcastCursorPosition?: (payload: import("./remoteHistorySync").WireCursorPosition) => void;
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
};

function findGroupIdForGraphRef(
	mosaicState: MosaicWorkspaceState,
	ref: GraphRef,
): string | undefined {
	for (const group of mosaicState.groups) {
		if (
			group.tabs.some(
				(t) => isGraphEditorTab(t) && graphRefsEqual(graphRefFromTab(t), ref),
			)
		) {
			return group.id;
		}
	}
	return mosaicState.focusedGroupId;
}

function resolveGraphEditorAtGroup(
	mosaicState: MosaicWorkspaceState,
	project: Core["project"],
	groupId: string,
): CurrentGraph | undefined {
	const group = mosaicState.groups.find((g) => g.id === groupId);
	if (!group) return;

	const tab = group.tabs[group.selectedIndex ?? 0];
	if (!tab || !isGraphEditorTab(tab)) return;

	const ref = graphRefFromTab(tab);
	const model = project.getGraphByKind(ref.graphKind, ref.graphId);
	if (!model) return;

	return { model, state: normalizeGraphEditorTab(tab) };
}

function resolveGraphEditorContext(
	ctx: ReturnType<typeof useInterfaceContext>,
	hoveredGroupId: string | null,
	mouse: { x: number; y: number },
): { groupId: string; graph: CurrentGraph; bounds: GraphBounds } | undefined {
	const groupId =
		findMosaicGroupIdAtPoint(mouse.x, mouse.y) ??
		hoveredGroupId ??
		ctx.mosaicState.focusedGroupId;

	const graph = resolveGraphEditorAtGroup(
		ctx.mosaicState,
		ctx.core.project,
		groupId,
	);
	if (!graph) return;

	const viewportBounds = getGraphViewportBounds(groupId);
	const bounds: GraphBounds = viewportBounds ?? ctx.graphBounds;

	return { groupId, graph, bounds };
}

function resolveGraphEditorByRef(
	ctx: ReturnType<typeof useInterfaceContext>,
	ref: GraphRef,
): { graph: CurrentGraph; bounds: GraphBounds; groupId: string } | undefined {
	const model = ctx.core.project.getGraphByKind(ref.graphKind, ref.graphId);
	if (!model) return;

	const groupId = findGroupIdForGraphRef(ctx.mosaicState, ref) ?? ctx.mosaicState.focusedGroupId;
	const group = ctx.mosaicState.groups.find((g) => g.id === groupId);
	if (!group) return;

	const tab =
		group.tabs.find(
			(t) => isGraphEditorTab(t) && graphRefsEqual(graphRefFromTab(t), ref),
		) ??
		group.tabs[group.selectedIndex ?? 0];
	if (!tab || !isGraphEditorTab(tab)) return;

	const bounds = getGraphViewportBounds(groupId) ?? ctx.graphBounds;

	return {
		groupId,
		graph: { model, state: normalizeGraphEditorTab(tab) },
		bounds,
	};
}

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

	const focusedGroup = () =>
		mosaicState.groups.find((g) => g.id === mosaicState.focusedGroupId);

	const currentGraph = Solid.createMemo(() => {
		const group = focusedGroup();
		const tab = group?.tabs[group?.selectedIndex ?? 0];
		if (!tab || !isGraphEditorTab(tab)) return;

		const ref = graphRefFromTab(tab);
		const model = ctx.core.project.getGraphByKind(ref.graphKind, ref.graphId);
		if (!model) return;

		return {
			model,
			state: normalizeGraphEditorTab(tab),
		} as unknown as CurrentGraph;
	});

	const [hoveredGroupId, setHoveredGroupId] = Solid.createSignal<string | null>(
		null,
	);

	Solid.createEffect(() => {
		if (!ctx.mosaicHydrated()) return;
		setHoveredGroupId(mosaicState.focusedGroupId);
	});

	const setSplitRatioAtPath = (path: number[], ratio: number) => {
		setMosaicState(
			produce((s) => {
				applySplitRatioAtPath(s.root, path, ratio);
			}),
		);
	};

	createKeydownShortcuts(currentGraph, hoveredGroupId, ctx);

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
			class="relative w-full h-full flex flex-row select-none bg-neutral-800 text-white animate-in fade-in overflow-hidden"
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
						toolbar={<Sidebars.ProjectSidebarToolbar />}
					>
						<Sidebars.Project
							currentGraph={currentGraph()?.model}
							project={ctx.core.project}
							onGraphClicked={(graph) => ctx.selectGraph(graph)}
							onFunctionClicked={(fn) => ctx.selectFunction(fn)}
							onQueueClicked={(queue) => ctx.selectQueue(queue)}
							onFunctionQueueClicked={(queue) => ctx.selectFunctionQueue(queue)}
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

			<div class="flex-1 flex flex-row h-full justify-center items-center text-white overflow-hidden min-w-0 min-h-0">
				<MosaicPaneProvider setHoveredGroupId={setHoveredGroupId}>
					<Solid.Show when={ctx.mosaicHydrated()}>
						<MosaicLayout
							key={mosaicLayoutKey(mosaicState.root)}
							node={mosaicState.root}
							Leaf={MosaicPaneHost}
							onSplitRatioChange={setSplitRatioAtPath}
							onSplitResizeEnd={() => ctx.persistMosaicLayoutNow("split-resize")}
						/>
					</Solid.Show>
					<TabDragGhost />
				</MosaicPaneProvider>
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
					const state = ctx.state;
					let menu:
						| import("./context").SchemaMenuOpenState
						| undefined;
					let suggestion: { pin: import("@macrograph/runtime").Pin } | undefined;

					if (state.status === "schemaMenuOpen") menu = state;
					else if (
						state.status === "connectionAssignMode" &&
						state.state.status === "schemaMenuOpen"
					) {
						menu = state.state;
						suggestion = { pin: state.pin };
					} else if (
						state.status === "pinDragMode" &&
						state.state.status === "schemaMenuOpen"
					) {
						menu = state.state;
						suggestion = { pin: state.pin };
					}

					if (!menu) return;

					const resolved = resolveGraphEditorByRef(ctx, menu);
					if (!resolved) return;

					return {
						...menu,
						graph: resolved.graph,
						bounds: resolved.bounds,
						groupId: resolved.groupId,
						suggestion,
					};
				})()}
			>
				{(data) => {
					const graphPosition = () =>
						toGraphSpace(data().position, data().bounds, data().graph.state);

					return (
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
												...graphRefOf(graph),
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
											const { model, state } = data().graph;

											const mousePosition = toGraphSpace(
												{
													x: data().position.x,
													y: data().position.y + 40,
												},
												data().bounds,
												state,
											);

											ctx.execute("pasteGraphSelection", {
												...graphRefOf(model),
												mousePosition,
												selection: item,
											});

											ctx.setState({ status: "idle" });
										}
									}}
									onSchemaClicked={(schema, targetSuggestion, extra) => {
										const graph = data().graph.model;
										const graphRef = graphRefOf(graph);
										ctx.batch(() => {
											const pin = Solid.batch(() => {
												const input: CreateNodeInput = {
													...graphRef,
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
													...graphRef,
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
					beginPaneResize();

					Solid.createRoot((dispose) => {
						let currentWidth = startWidth;
						let raf = 0;

						const flushWidth = () => {
							raf = 0;
							props.onResize?.(currentWidth);
						};

						Solid.onCleanup(() => {
							setDragging(false);
							if (raf) cancelAnimationFrame(raf);
							flushWidth();
							endPaneResize();
							props.onResizeEnd?.(currentWidth);
						});

						createEventListenerMap(window, {
							pointerup: dispose,
							pointermove: (e) => {
								currentWidth =
									startWidth +
									(e.clientX - startX) * (props.side === "right" ? 1 : -1);

								if (!raf) {
									raf = requestAnimationFrame(flushWidth);
								}
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
	hoveredGroupId: Solid.Accessor<string | null>,
	ctx: ReturnType<typeof useInterfaceContext>,
) {
	const platform = usePlatform();
	const mouse = createMousePosition(window);

	createEventListener(window, "keydown", async (e) => {
		if (isEditingText(e)) return;

		switch (e.code) {
			case "Backslash": {
				if (!isCtrlEvent(e)) break;
				const next = splitFocusedGroup(
					ctx.mosaicState,
					e.shiftKey ? "horizontal" : "vertical",
				);
				ctx.setMosaicWorkspaceState(next);
				ctx.persistMosaicLayoutNow(
					e.shiftKey ? "shortcut-split-h" : "shortcut-split-v",
				);
				e.preventDefault();
				return;
			}
			case "KeyW": {
				if (!isCtrlEvent(e) || e.shiftKey) break;
				const gi = findGroupIndex(
					ctx.mosaicState.groups,
					ctx.mosaicState.focusedGroupId,
				);
				if (gi < 0) break;
				const group = ctx.mosaicState.groups[gi];
				if (!group?.tabs.length) break;
				const next = closeTabInGroup(
					ctx.mosaicState,
					ctx.mosaicState.focusedGroupId,
					group.selectedIndex,
				);
				ctx.setMosaicWorkspaceState(next);
				ctx.persistMosaicLayoutNow("shortcut-close-tab");
				e.preventDefault();
				return;
			}
			case "PageUp":
			case "PageDown": {
				if (!isCtrlEvent(e)) break;
				const next = focusAdjacentLeaf(
					ctx.mosaicState,
					e.code === "PageDown" ? 1 : -1,
				);
				ctx.setMosaicState("focusedGroupId", next.focusedGroupId);
				e.preventDefault();
				return;
			}
			case "Digit1":
			case "Digit2":
			case "Digit3":
			case "Digit4":
			case "Digit5":
			case "Digit6":
			case "Digit7":
			case "Digit8":
			case "Digit9": {
				if (!isCtrlEvent(e) || e.shiftKey || e.altKey) break;
				const index = Number(e.code.replace("Digit", "")) - 1;
				const next = focusLeafByIndex(ctx.mosaicState, index);
				ctx.setMosaicState("focusedGroupId", next.focusedGroupId);
				e.preventDefault();
				return;
			}
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

				const target = resolveGraphEditorContext(
					ctx,
					hoveredGroupId(),
					mouse,
				);
				if (!target) break;

				if (target.groupId !== ctx.mosaicState.focusedGroupId) {
					ctx.setMosaicState("focusedGroupId", target.groupId);
				}

				switch (item.type) {
					case "selection": {
						const { model, state } = target.graph;

						const mousePosition = toGraphSpace(
							{ x: mouse.x - 10, y: mouse.y - 10 },
							target.bounds,
							state,
						);

						ctx.execute("pasteGraphSelection", {
							...graphRefOf(model),
							mousePosition,
							selection: item,
						});

						break;
					}
					case "graph": {
						await ctx.execute("pasteGraph", item.graph);
						const graph = ctx.core.project.getGraphByKind(
							"graph",
							item.graph.id,
						);
						if (graph) ctx.selectGraphInGroup(target.groupId, graph);

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
						...graphRefOf(graph.model),
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

					ctx.execute("setGraphItemPositions", { ...graphRefOf(model), items });
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

				ctx.execute("setGraphItemPositions", { ...graphRefOf(model), items });

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
					ctx.execute("deleteGraphItems", { ...graphRefOf(model), items });

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
	if (tab.type === "graph") {
		const ref = graphRefFromTab(tab);
		return ctx.core.project.getGraphByKind(ref.graphKind, ref.graphId)?.name ?? "Graph";
	}
	if (tab.type === "function") {
		const fn = [...ctx.core.project.functions].find(([, f]) => f.id === tab.functionId)?.[1];
		return fn?.name ?? "Function";
	}
	if (tab.type === "queue") {
		const q = ctx.core.project.queues.get(tab.queueId);
		return q?.name ?? "Queue";
	}
	if (tab.type === "functionQueue") {
		const q = ctx.core.project.functionQueues.get(tab.functionQueueId);
		return q?.name ?? "Function Queue";
	}
	if (tab.type === "settings") return "Settings";
	if (tab.type === "package") return `pkg: ${tab.packageName}`;
	return "Tab";
}

const TAB_DRAG_THRESHOLD_PX = 5;

function MosaicPaneHost(props: { groupId: string }) {
	const ctx = useInterfaceContext();
	const shell = useMosaicPane();
	const focused = Solid.createMemo(
		() => ctx.mosaicState.focusedGroupId === props.groupId,
	);
	const canClosePane = Solid.createMemo(
		() => collectLeafGroupIds(ctx.mosaicState.root).length > 1,
	);

	return (
		<GraphTabList
			groupId={props.groupId}
			focused={focused()}
			canClosePane={canClosePane()}
			onTabClose={(index) => {
				const next = closeTabInGroup(ctx.mosaicState, props.groupId, index);
				ctx.setMosaicWorkspaceState(next);
				ctx.persistMosaicLayoutNow("tab-close");
			}}
			onSelectedChanged={(tabIndex) => {
				const gi = findGroupIndex(ctx.mosaicState.groups, props.groupId);
				if (gi < 0) return;
				const tab = ctx.mosaicState.groups[gi]?.tabs[tabIndex];
				const key = tab ? tabKey(tab) : undefined;
				ctx.setMosaicState("groups", gi, "selectedIndex", tabIndex);
				ctx.setMosaicState("groups", gi, "selectedTabKey", key);
				queueMicrotask(() => {
					ctx.persistMosaicLayoutNow("tab-click");
				});
			}}
			onFocus={() => {
				ctx.setMosaicState("focusedGroupId", props.groupId);
			}}
			onClose={() => {
				const next = closeGroup(ctx.mosaicState, props.groupId);
				ctx.setMosaicWorkspaceState(next);
				ctx.persistMosaicLayoutNow("pane-close");
			}}
			setHoveredGroupId={shell.setHoveredGroupId}
		/>
	);
}

function TabDragGhost() {
	return (
		<Solid.Show when={getTabDragSession()}>
			{(s) => (
				<div
					class="fixed z-[100] pointer-events-none px-3 py-1.5 rounded bg-neutral-700 border border-neutral-500 text-sm text-white shadow-lg"
					style={{
						left: `${getTabDragGhostPos().x}px`,
						top: `${getTabDragGhostPos().y}px`,
						transform: "translate(8px, 8px)",
						color: tabColorForType(s().tab.type) ?? undefined,
						background:
							tabTintBackground(tabColorForType(s().tab.type), "#262626") ??
							undefined,
					}}
				>
					{s().label}
				</div>
			)}
		</Solid.Show>
	);
}

function MosaicTabPanel(props: {
	tab: TabState;
	tabIndex: number;
	groupId: string;
	active: boolean;
	focused: boolean;
	canClosePane: boolean;
	onClose: () => void;
}) {
	const ctx = useInterfaceContext();
	const groupIndex = () => findGroupIndex(ctx.mosaicState.groups, props.groupId);

	if (isGraphEditorTab(props.tab)) {
		const tab = props.tab;
		const graph = ctx.core.project.getGraphByKind(
			graphRefFromTab(tab).graphKind,
			tab.graphId,
		);
		if (!graph) return null;

		const gi = groupIndex();
		const setGraphTranslate = (t: XY) => {
			if (gi < 0) return;
			ctx.setMosaicState("groups", gi, "tabs", props.tabIndex, "translate", t);
		};
		const setGraphScale = (s: number) => {
			if (gi < 0) return;
			ctx.setMosaicState("groups", gi, "tabs", props.tabIndex, "scale", s);
		};
		const tint = tabColorForType(tab.type);

		return (
			<Graph
				active={props.active}
				graph={graph}
				state={normalizeGraphEditorTab(tab)}
				mosaicGroupId={props.groupId}
				style={{
					"background-color":
						tabTintBackground(tint, "#262626") ?? undefined,
				}}
				onBoundsChange={props.active ? ctx.setGraphBounds : () => {}}
				onSizeChange={props.active ? ctx.setGraphBounds : () => {}}
				onScaleChange={setGraphScale}
				onTranslateChange={setGraphTranslate}
			/>
		);
	}

	if (props.tab.type === "package") {
		const pkg = ctx.core.packages.find((p) => p.name === props.tab.packageName);
		return (
			<div class="flex-1 w-full flex flex-row overflow-auto bg-neutral-900">
				<div class="flex-1 overflow-y-auto p-4 text-white">
					<Solid.Suspense fallback="Loading...">
						<Solid.ErrorBoundary
							fallback={
								<span class="text-red-400">Error loading package settings</span>
							}
						>
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

	if (props.tab.type === "functionQueue") {
		const queue = ctx.core.project.functionQueues.get(
			props.tab.functionQueueId,
		);
		return (
			<div class="flex-1 w-full flex flex-row overflow-auto bg-neutral-900">
				<div class="flex-1 overflow-y-auto p-4 text-white">
					{queue ? (
						<FunctionQueuePanel queue={queue} />
					) : (
						<span class="text-neutral-500">Function queue not found</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<div class="flex-1 flex flex-col items-center justify-center w-full">
			<Solid.Show when={props.canClosePane}>
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
		</div>
	);
}

function GraphTabList(props: {
	groupId: string;
	focused: boolean;
	canClosePane: boolean;
	onSelectedChanged: (index: number) => void;
	onTabClose: (index: number) => void;
	onFocus: () => void;
	onClose: () => void;
	setHoveredGroupId: Solid.Setter<string | null>;
}) {
	const ctx = useInterfaceContext();
	let tabBarRef: HTMLDivElement | undefined;
	let dragFromIndex: number | null = null;
	let pointerStartX = 0;
	let pointerStartY = 0;
	let suppressClick = false;
	const [dragActive, setDragActive] = Solid.createSignal(false);
	const [dragIndex, setDragIndex] = Solid.createSignal<number | null>(null);

	const groupIndex = () => findGroupIndex(ctx.mosaicState.groups, props.groupId);

	const reorderTabs = (from: number, to: number) => {
		if (from === to) return;
		const gi = groupIndex();
		if (gi < 0) return;
		ctx.setMosaicState(
			"groups",
			gi,
			produce((state) => {
				moveTabInGroup(state, from, to);
			}),
		);
		dragFromIndex = to;
		setDragIndex(to);
	};

	const handleTabPointerDown = (e: PointerEvent, index: number) => {
		if (e.button !== 0) return;
		const target = e.target as HTMLElement;
		if (target.closest("[data-tab-close]")) return;

		const el = e.currentTarget as HTMLElement;
		const g = group();
		if (!g) return;

		dragFromIndex = index;
		pointerStartX = e.clientX;
		pointerStartY = e.clientY;
		setDragIndex(index);
		let dragging = false;
		const tab = g.tabs[index];
		if (!tab) return;

		const onMove = (ev: PointerEvent) => {
			if (dragFromIndex === null) return;
			if (
				!dragging &&
				Math.abs(ev.clientX - pointerStartX) < TAB_DRAG_THRESHOLD_PX &&
				Math.abs(ev.clientY - pointerStartY) < TAB_DRAG_THRESHOLD_PX
			) {
				return;
			}
			if (!dragging) {
				dragging = true;
				setDragActive(true);
				// Tab buttons may remount during drag (nested splits); document listeners don't need capture.
				try {
					if (el.isConnected) el.setPointerCapture(ev.pointerId);
				} catch {
					// continue without capture
				}
				startTabDragSession({
					tab,
					label: tabLabel(tab, ctx),
					sourceGroupId: props.groupId,
					sourceIndex: index,
					duplicate: ev.altKey,
				});
			}

			updateTabDragGhost(ev.clientX, ev.clientY);
			const dropTarget = detectDropTarget(ev.clientX, ev.clientY, true);
			updateTabDropTarget(dropTarget);
			if (
				!ev.altKey &&
				dropTarget?.kind === "tabBar" &&
				dropTarget.groupId === props.groupId &&
				dropTarget.insertIndex !== undefined &&
				dragFromIndex !== null
			) {
				let to = dropTarget.insertIndex;
				if (to > dragFromIndex) to -= 1;
				if (to !== dragFromIndex) reorderTabs(dragFromIndex, to);
			}
		};

		const onUp = (ev: PointerEvent) => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			if (dragging) {
				suppressClick = true;
				try {
					if (el.isConnected) el.releasePointerCapture(ev.pointerId);
				} catch {
					// pointer may already be released
				}
				const session = getTabDragSession();
				const dropTarget = getTabDropTarget();
				if (session) {
					const tabForDrop = session.duplicate
						? duplicateTab(session.tab)
						: duplicateTab(session.tab);
					const next = applyTabDrop(ctx.mosaicState, {
						tab: tabForDrop,
						sourceGroupId: session.sourceGroupId,
						sourceIndex: dragFromIndex ?? session.sourceIndex,
						duplicate: session.duplicate,
						dropTarget,
					});
					ctx.setMosaicWorkspaceState(next);
					ctx.persistMosaicLayoutNow("tab-drag-drop");
				}
				endTabDragSession();
			}
			dragFromIndex = null;
			setDragActive(false);
			setDragIndex(null);
		};

		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
	};

	const group = () => {
		const gi = groupIndex();
		if (gi < 0) return;
		return ctx.mosaicState.groups[gi];
	};

	const isDropTarget = () => {
		const t = getTabDropTarget();
		return t?.groupId === props.groupId && !t.edge;
	};
	const splitEdge = () => {
		const t = getTabDropTarget();
		if (t?.groupId !== props.groupId || !t.edge) return;
		return t.edge;
	};

	const selectedTab = () => {
		const g = group();
		if (!g) return;
		return g.tabs[g.selectedIndex];
	};

	const selectedTabContentTint = () => {
		const tab = selectedTab();
		if (!tab || tab.type === "package" || tab.type === "functionQueue") {
			return undefined;
		}
		return tabColorForType(tab.type);
	};

	return (
		<div
			data-mosaic-group-id={props.groupId}
			class="flex-1 flex flex-col h-full relative min-h-0 min-w-0"
			onMouseDown={() => {
				setTimeout(() => {
					props.onFocus();
				}, 1);
			}}
			onMouseEnter={() => props.setHoveredGroupId(props.groupId)}
			onMouseMove={() => props.setHoveredGroupId(props.groupId)}
			onMouseLeave={() =>
				props.setHoveredGroupId(ctx.mosaicState.focusedGroupId)
			}
		>
			<Solid.Show when={splitEdge()}>
				{(edge) => <SplitDropOverlay edge={edge()} />}
			</Solid.Show>
			<div
				ref={tabBarRef}
				data-mosaic-tab-bar
				class="overflow-x-auto w-full shrink-0 scrollbar scrollbar-none border-b border-neutral-700 h-8 flex flex-row text-sm"
				classList={{
					"select-none": dragActive(),
					"ring-1 ring-inset ring-sky-400/60": isDropTarget(),
				}}
			>
				<Solid.For each={group()?.tabs ?? []}>
					{(tab, index) => {
						const color = () => tabColorForType(tab.type);
						const selected = () => group()?.selectedIndex === index();
						return (
						<button
							type="button"
							data-tab-index={index()}
							class={clsx(
								"py-2 px-4 flex flex-row items-center relative group shrink-0 whitespace-nowrap transition-colors touch-none",
								dragActive() && dragIndex() === index() && "opacity-40",
								!dragActive() && "cursor-grab active:cursor-grabbing",
								selected() && !color() && (props.focused ? "bg-white/20" : "bg-white/10"),
								!selected() && "hover:bg-white/5",
								!color() && selected() && tab.type === "settings" && "text-purple-200",
								!color() && !selected() && tab.type === "settings" && "text-purple-300",
							)}
							style={
								color()
									? {
											color: color(),
											background: tabButtonBackground(
												color(),
												selected(),
												props.focused,
											),
										}
									: undefined
							}
							onPointerDown={(e) => handleTabPointerDown(e, index())}
							onClick={() => {
								if (suppressClick) {
									suppressClick = false;
									return;
								}
								props.onSelectedChanged(index());
							}}
						>
							<span
								class="font-medium"
								style={
									color() && !selected()
										? { opacity: 0.85 }
										: undefined
								}
							>
								{tabLabel(tab, ctx)}
							</span>
							<span
								data-tab-close
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
						);
					}}
				</Solid.For>
				<div class="flex-1" />
			</div>
			<div
				class="flex-1 flex flex-col min-h-0 w-full relative"
				classList={{ "ring-1 ring-inset ring-sky-400/60": isDropTarget() }}
				style={{
					"background-color":
						tabTintBackground(selectedTabContentTint(), "#262626") ??
						undefined,
				}}
			>
				<Solid.Show
					when={(() => {
						const g = group();
						if (!g?.tabs.length) return undefined;
						const idx = Math.min(
							Math.max(0, g.selectedIndex),
							g.tabs.length - 1,
						);
						const tab = g.tabs[idx];
						if (!tab) return undefined;
						return { tab, tabIndex: idx, key: tabKey(tab) };
					})()}
					keyed
				>
					{(entry) => (
						<div class="absolute inset-0 flex flex-col min-h-0 w-full">
							<MosaicTabPanel
								tab={entry.tab}
								tabIndex={entry.tabIndex}
								groupId={props.groupId}
								active
								focused={props.focused}
								canClosePane={props.canClosePane}
								onClose={props.onClose}
							/>
						</div>
					)}
				</Solid.Show>
				<Solid.Show when={(group()?.tabs.length ?? 0) === 0}>
					<div class="flex-1 flex flex-col items-center justify-center w-full">
						<Solid.Show when={props.canClosePane}>
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
					</div>
				</Solid.Show>
			</div>
		</div>
	);
}
