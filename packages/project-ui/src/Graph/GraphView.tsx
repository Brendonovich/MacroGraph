import { Option } from "effect";
import { ContextMenu } from "@kobalte/core/context-menu";
import { type Graph, IO, Node, type Schema } from "@macrograph/project-domain";
import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { cx } from "cva";
import type { ValidComponent } from "solid-js";
import {
	batch,
	type ComponentProps,
	createEffect,
	createSignal,
	For,
	Show,
} from "solid-js";

import type { NodeState } from "../State";
import { useGraphContext } from "./Context";
import {
	createLongPress,
	createPointerDrag,
	createTwoPointerGesture,
	createWheelHandler,
} from "./hooks";
import {
	getAreaSelectionBounds,
	getDraggingIO,
	getLongPressTimerId,
	getPanOrigin,
	getSelectionDragPositions,
	type InteractionState,
	InteractionState as IS,
	isPanning,
	LONG_PRESS_TIMEOUT_MS,
	MAX_ZOOM,
	MIN_ZOOM,
	TOUCH_MOVE_THRESHOLD,
} from "./interaction-state";
import { NodeHeader, NodeRoot } from "./Node";
import type { GraphTwoWayConnections } from "./types";
import { Viewport } from "./viewport";

export function GraphView(
	props: {
		nodes: NodeState[];
		connections?: GraphTwoWayConnections;
		selection?: Array<Graph.ItemRef>;
		getSchema: (
			ref: Schema.Ref,
		) => Option.Option<{ name: string; id: Schema.Id; type: Schema.Type }>;
		remoteSelections?: Array<{ colour: string; nodes: Set<Node.Id> }>;
		onSelectionDrag?(
			items: Array<[Graph.ItemRef, { x: number; y: number }]>,
		): void;
		onSelectionDragEnd?(
			items: Array<[Graph.ItemRef, { x: number; y: number }]>,
		): void;
		onItemsSelected?(selection: Array<Graph.ItemRef>): void;
		onConnectIO?(from: IO.RefString, to: IO.RefString): void;
		onDisconnectIO?(io: IO.RefString): void;
		onContextMenu?(e: MouseEvent | PointerEvent): void;
		onContextMenuClose?(): void;
		onDeleteSelection?(): void;
		onTranslateChange?(translate: { x: number; y: number }): void;
		onScaleChange?(zoom: number): void;
	} & Pick<ComponentProps<"div">, "ref" | "children">,
) {
	const [state, setState] = createSignal<InteractionState>(
		/* IS.areaSelection(0, {x: 0,y: 0}, {x:1,y:1}) */ IS.idle(),
	);

	const graphCtx = useGraphContext();
	const [ref, setRef] = createSignal<HTMLDivElement | undefined>();
	const bounds = createElementBounds(ref);
	const mouse = createMousePosition();

	// ============ Viewport Helpers ============

	function getViewport(): Viewport.Viewport {
		return {
			origin: graphCtx.translate ?? { x: 0, y: 0 },
			scale: graphCtx.scale,
		};
	}

	function getBounds(): Viewport.Bounds {
		return { left: bounds.left ?? 0, top: bounds.top ?? 0 };
	}

	function getScreenRelativePosition(pos: { x: number; y: number }): {
		x: number;
		y: number;
	};
	function getScreenRelativePosition(e: { clientX: number; clientY: number }): {
		x: number;
		y: number;
	};
	function getScreenRelativePosition(
		input: { x: number; y: number } | { clientX: number; clientY: number },
	) {
		const x = "clientX" in input ? input.clientX : input.x;
		const y = "clientY" in input ? input.clientY : input.y;
		return { x: x - (bounds.left ?? 0), y: y - (bounds.top ?? 0) };
	}

	const getEventGraphPosition = (e: MouseEvent) =>
		graphCtx.getGraphPosition({ x: e.clientX, y: e.clientY });

	// ============ Area Selection Helpers ============

	type Rectangle = { x: number; y: number; width: number; height: number };

	function getSelectionRectangle(
		startGraphPosition: { x: number; y: number },
		currentScreenPosition: { x: number; y: number },
	): Rectangle {
		// Convert current screen position (viewport-relative) to canvas coordinates
		const b = getBounds();
		const currentGraphPosition = graphCtx.getGraphPosition({
			x: currentScreenPosition.x + b.left,
			y: currentScreenPosition.y + b.top,
		});

		// Normalize rectangle to handle dragging in any direction
		const x = Math.min(startGraphPosition.x, currentGraphPosition.x);
		const y = Math.min(startGraphPosition.y, currentGraphPosition.y);
		const width = Math.abs(currentGraphPosition.x - startGraphPosition.x);
		const height = Math.abs(currentGraphPosition.y - startGraphPosition.y);

		return { x, y, width, height };
	}

	function calculateOverlapPercentage(
		selectionRect: Rectangle,
		nodeRect: Rectangle,
	): { widthPercent: number; heightPercent: number } {
		// Calculate intersection rectangle
		const intersectionLeft = Math.max(selectionRect.x, nodeRect.x);
		const intersectionRight = Math.min(
			selectionRect.x + selectionRect.width,
			nodeRect.x + nodeRect.width,
		);
		const intersectionTop = Math.max(selectionRect.y, nodeRect.y);
		const intersectionBottom = Math.min(
			selectionRect.y + selectionRect.height,
			nodeRect.y + nodeRect.height,
		);

		const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
		const intersectionHeight = Math.max(
			0,
			intersectionBottom - intersectionTop,
		);

		const widthPercent = intersectionWidth / nodeRect.width;
		const heightPercent = intersectionHeight / nodeRect.height;

		return { widthPercent, heightPercent };
	}

	function getNodesInSelection(
		selectionRect: Rectangle,
		nodes: NodeState[],
		threshold = 0.8,
	): Node.Id[] {
		const selectedNodes: Node.Id[] = [];

		for (const node of nodes) {
			const bounds = graphCtx.nodeBounds.get(node.id);
			if (!bounds) continue;

			const { widthPercent, heightPercent } = calculateOverlapPercentage(
				selectionRect,
				bounds,
			);

			// Node must meet threshold for BOTH width AND height
			if (widthPercent >= threshold && heightPercent >= threshold) {
				selectedNodes.push(node.id);
			}
		}

		return selectedNodes;
	}

	function updateAreaSelection(
		startGraphPosition: { x: number; y: number },
		currentScreenPosition: { x: number; y: number },
		additive: boolean,
	): void {
		const selectionRect = getSelectionRectangle(
			startGraphPosition,
			currentScreenPosition,
		);
		const nodesInArea = getNodesInSelection(selectionRect, props.nodes);

		let newSelection: Graph.ItemRef[];

		if (additive) {
			// Start with existing selection
			const existing = new Set<Node.Id>(
				props.selection
					?.map((ref) => (ref[0] === "Node" ? ref[1] : null))
					.filter((id): id is Node.Id => id !== null) ?? [],
			);
			// Add nodes in area
			for (const nodeId of nodesInArea) {
				existing.add(nodeId);
			}
			// Convert back to ItemRef format
			newSelection = Array.from(existing).map(
				(id) => ["Node", id] as Graph.ItemRef,
			);
		} else {
			// Replace selection with only nodes in area
			newSelection = nodesInArea.map((id) => ["Node", id] as Graph.ItemRef);
		}

		props.onItemsSelected?.(newSelection);
	}

	// ============ Wheel Handler ============

	const handleWheel = createWheelHandler({
		getViewport,
		getBounds,
		getZoomAnchor: () => getPanOrigin(state()),
		onScaleChange: (scale) => props.onScaleChange?.(scale),
		onTranslateChange: (origin) => props.onTranslateChange?.(origin),
	});

	createEventListener(ref, "wheel", handleWheel);

	// ============ Touch Gesture Handlers ============

	function startTwoFingerGesture(
		left: { pointerId: number; position: { x: number; y: number } },
		right: { pointerId: number; position: { x: number; y: number } },
	) {
		// Capture initial viewport state - cumulative deltas will be applied to this
		const initialViewport = getViewport();
		const initialScale = initialViewport.scale;

		setState(
			IS.touchTwoFingerGesture(
				{
					pointerId: left.pointerId,
					start: left.position,
					current: left.position,
				},
				{
					pointerId: right.pointerId,
					start: right.position,
					current: right.position,
				},
				initialScale,
			),
		);

		createTwoPointerGesture({
			left,
			right,
			callbacks: {
				onGestureMove: (cumulativePanDelta, cumulativeScaleRatio, midpoint) => {
					const b = getBounds();

					// Apply cumulative pan and zoom to the INITIAL viewport state
					// This ensures that multiple callback invocations (one per finger)
					// produce the same result, preventing double-panning
					const viewport = Viewport.panAndZoom(
						initialViewport,
						cumulativePanDelta,
						cumulativeScaleRatio,
						{ x: midpoint.x - b.left, y: midpoint.y - b.top },
						MIN_ZOOM,
						MAX_ZOOM,
					);

					props.onScaleChange?.(viewport.scale);
					props.onTranslateChange?.(viewport.origin);
				},
				onGestureEnd: () => {
					setState(IS.idle());
				},
			},
		});
	}

	function startSingleFingerDrag(
		pointerId: number,
		startPos: { x: number; y: number },
	) {
		const startGraphPosition = graphCtx.getGraphPosition(startPos);
		const currentScreenPosition = getScreenRelativePosition(startPos);

		batch(() => {
			props.onItemsSelected?.([]);
			setState(
				IS.touchSingleFingerDrag(
					{ pointerId, start: startPos, current: startPos },
					startGraphPosition,
					currentScreenPosition,
				),
			);
		});

		createPointerDrag({
			pointerId,
			startPosition: startPos,
			callbacks: {
				onMove: (e) => {
					const currentScreenPosition = getScreenRelativePosition(e);
					setState(
						IS.touchSingleFingerDrag(
							{
								pointerId,
								start: startPos,
								current: { x: e.clientX, y: e.clientY },
							},
							startGraphPosition,
							currentScreenPosition,
						),
					);
					updateAreaSelection(startGraphPosition, currentScreenPosition, false);
				},
				onUp: () => {
					const currentState = state();
					const bounds = getAreaSelectionBounds(currentState);
					if (bounds) {
						updateAreaSelection(
							bounds.startGraphPosition,
							bounds.currentScreenPosition,
							false,
						);
					}
					setState(IS.idle());
				},
			},
		});
	}

	// ============ Touch Pointer Down Handler ============

	function handleTouchPointerDown(downEvent: PointerEvent) {
		const currentState = state();

		// Ignore additional touches if already in an active gesture
		// Only allow adding touches in awaiting state, and max 2 fingers
		if (
			currentState.type === "touch" &&
			(currentState.gesture.type !== "awaiting" ||
				currentState.gesture.pointers.length >= 2)
		)
			return;

		// Get existing pointers if we're already in touch awaiting state
		const existingPointers =
			currentState.type === "touch" && currentState.gesture.type === "awaiting"
				? currentState.gesture.pointers
				: [];

		const newPointer = {
			pointerId: downEvent.pointerId,
			start: { x: downEvent.clientX, y: downEvent.clientY },
			current: { x: downEvent.clientX, y: downEvent.clientY },
		};
		const pointers = [...existingPointers, newPointer];

		// Close context menu on touch (if not already in a gesture)
		if (existingPointers.length === 0) {
			props.onContextMenuClose?.();
		}

		// Cancel any existing long-press timer when adding a new pointer
		const existingTimerId = getLongPressTimerId(currentState);
		if (existingTimerId !== null) {
			clearTimeout(existingTimerId);
		}

		if (pointers.length === 2) {
			// Two fingers - wait for movement to start two-finger gesture
			const left = pointers[0]!;
			const right = pointers[1]!;

			setState(IS.touchAwaiting(pointers, null));

			// Track movement to detect gesture start
			createPointerDrag({
				pointerId: left.pointerId,
				startPosition: left.start,
				threshold: TOUCH_MOVE_THRESHOLD,
				callbacks: {
					onMove: () => {
						startTwoFingerGesture(
							{ pointerId: left.pointerId, position: left.current },
							{ pointerId: right.pointerId, position: right.current },
						);
						return false; // Stop this drag tracker
					},
					onUp: () => {
						setState(IS.idle());
					},
				},
			});

			// Also track the right pointer
			createPointerDrag({
				pointerId: right.pointerId,
				startPosition: right.start,
				threshold: TOUCH_MOVE_THRESHOLD,
				callbacks: {
					onMove: () => {
						startTwoFingerGesture(
							{ pointerId: left.pointerId, position: left.current },
							{ pointerId: right.pointerId, position: right.current },
						);
						return false;
					},
					onUp: () => {
						setState(IS.idle());
					},
				},
			});

			return;
		}

		if (pointers.length === 1) {
			// Single finger - start long-press timer and wait for movement
			const startPos = { x: downEvent.clientX, y: downEvent.clientY };
			const pointer = pointers[0]!;

			setState(IS.touchAwaiting(pointers, null));

			const { dispose: disposeLongPress } = createLongPress(downEvent, {
				timeout: LONG_PRESS_TIMEOUT_MS,
				moveThreshold: TOUCH_MOVE_THRESHOLD,
				onLongPress: () => {
					props.onContextMenu?.(downEvent);
					setState(IS.idle());
				},
				onCancel: () => {
					// Long press cancelled - movement detected
				},
			});

			createPointerDrag({
				pointerId: pointer.pointerId,
				startPosition: startPos,
				threshold: TOUCH_MOVE_THRESHOLD,
				callbacks: {
					onMove: () => {
						disposeLongPress();
						// Check if we're still in awaiting state with only 1 finger
						const s = state();
						if (
							s.type === "touch" &&
							s.gesture.type === "awaiting" &&
							s.gesture.pointers.length === 1
						) {
							// Still single finger - start drag
							startSingleFingerDrag(pointer.pointerId, startPos);
						}
						// Otherwise a second finger was added, so stop tracking
						return false;
					},
					onUp: () => {
						disposeLongPress();
						setState(IS.idle());
					},
				},
			});

			return;
		}

		// More than 2 fingers - ignore
	}

	// ============ Mouse Left-Click Handler (Area Selection) ============

	function handleLeftClickCanvas(downEvent: PointerEvent) {
		if (state().type !== "idle") return;

		downEvent.preventDefault();
		props.onContextMenuClose?.();

		const startGraphPosition = getEventGraphPosition(downEvent);
		const currentScreenPosition = getScreenRelativePosition(downEvent);
		const additive = downEvent.shiftKey;

		batch(() => {
			if (!additive) {
				props.onItemsSelected?.([]);
			}
			setState(
				IS.areaSelection(
					downEvent.pointerId,
					startGraphPosition,
					currentScreenPosition,
				),
			);
		});

		createPointerDrag({
			pointerId: downEvent.pointerId,
			startPosition: { x: downEvent.clientX, y: downEvent.clientY },
			callbacks: {
				onMove: (e) => {
					const currentScreenPosition = getScreenRelativePosition(e);
					setState(
						IS.areaSelection(
							downEvent.pointerId,
							startGraphPosition,
							currentScreenPosition,
						),
					);
					updateAreaSelection(
						startGraphPosition,
						currentScreenPosition,
						additive,
					);
				},
				onUp: () => {
					const currentState = state();
					const bounds = getAreaSelectionBounds(currentState);
					if (bounds) {
						updateAreaSelection(
							bounds.startGraphPosition,
							bounds.currentScreenPosition,
							additive,
						);
					}
					setState(IS.idle());
				},
			},
		});
	}

	// ============ Mouse Right-Click Handler (Pan/Context Menu) ============

	function handleRightClickCanvas(downEvent: PointerEvent) {
		downEvent.preventDefault();

		const startScreenPosition = { x: downEvent.clientX, y: downEvent.clientY };

		setState(IS.rightClickPending(downEvent.pointerId, startScreenPosition));

		let lastMousePosition = { ...startScreenPosition };

		createPointerDrag({
			pointerId: downEvent.pointerId,
			startPosition: startScreenPosition,
			callbacks: {
				onMove: (e, incrementalDelta) => {
					const currentState = state();
					if (currentState.type !== "right-click") return;

					const distance = Math.hypot(
						e.clientX - startScreenPosition.x,
						e.clientY - startScreenPosition.y,
					);

					if (distance > 5) {
						// Pan threshold
						// Apply pan
						const currentViewport = getViewport();
						const newViewport = Viewport.panByScreenDelta(currentViewport, {
							x: -incrementalDelta.x,
							y: -incrementalDelta.y,
						});
						props.onTranslateChange?.(newViewport.origin);

						lastMousePosition = { x: e.clientX, y: e.clientY };

						setState(
							IS.rightClickPanning(
								downEvent.pointerId,
								startScreenPosition,
								lastMousePosition,
								{ x: e.clientX, y: e.clientY },
							),
						);
					}
				},
				onUp: (e) => {
					const currentState = state();
					if (
						currentState.type === "right-click" &&
						currentState.mode.type === "pending"
					) {
						props.onContextMenu?.(e);
					}
					setState(IS.idle());
				},
			},
		});
	}

	// ============ Connections Rendering ============

	const connections = () => {
		const ret: {
			from: { x: number; y: number };
			to: { x: number; y: number };
			opacity?: number;
		}[] = [];

		const draggingIO = getDraggingIO(state());

		if (draggingIO) {
			const position = graphCtx.ioPositions.get(draggingIO);

			if (position) {
				const mouseScreenRelative = getScreenRelativePosition(mouse);
				const b = getBounds();
				// Convert mouse position from viewport-relative screen coords to canvas coords
				const mouseCanvasPos = graphCtx.getGraphPosition({
					x: mouseScreenRelative.x + b.left,
					y: mouseScreenRelative.y + b.top,
				});

				ret.push(
					draggingIO.includes(":o:")
						? { from: { ...position }, to: mouseCanvasPos, opacity: 0.5 }
						: { to: { ...position }, from: mouseCanvasPos, opacity: 0.5 },
				);
			}
		}

		for (const [outNodeIdStr, outConnections] of Object.entries(
			props.connections ?? {},
		)) {
			if (!outConnections.out) continue;
			const outNodeId = Node.Id.make(Number(outNodeIdStr));
			for (const [outIdStr, inputs] of Object.entries(outConnections.out)) {
				const outId = IO.Id.make(outIdStr);
				const outPosition = graphCtx.ioPositions.get(`${outNodeId}:o:${outId}`);
				if (!outPosition) continue;

				for (const [inNodeId, inId] of inputs) {
					const inPosition = graphCtx.ioPositions.get(`${inNodeId}:i:${inId}`);
					if (!inPosition) continue;

					ret.push({ from: { ...outPosition }, to: { ...inPosition } });
				}
			}
		}

		// Convert IO positions from canvas coords to viewport-relative screen coords
		const viewport = getViewport();
		for (const val of ret) {
			val.from = Viewport.canvasToViewportRelative(viewport, val.from);
			val.to = Viewport.canvasToViewportRelative(viewport, val.to);
		}

		return ret;
	};

	// ============ Node Header Drag Handler ============

	function handleNodeHeaderDrag(downEvent: PointerEvent, node: NodeState) {
		downEvent.stopPropagation();

		// Handle selection
		if (downEvent.shiftKey) {
			const index = props.selection?.findIndex(
				(ref) => ref[0] === "Node" && ref[1] === node.id,
			);
			if (index !== -1) {
				props.onItemsSelected?.(
					props.selection?.filter(
						(ref) => !(ref[0] === "Node" && ref[1] === node.id),
					) ?? [],
				);
			} else {
				props.onItemsSelected?.([
					...(props.selection ?? []),
					["Node", node.id],
				]);
			}
		} else if ((props.selection?.length ?? 0) <= 1) {
			props.onItemsSelected?.([["Node", node.id]]);
		}

		// Collect start positions
		const startPositions: Array<[Graph.ItemRef, { x: number; y: number }]> = [];
		for (const nodeId of props.selection ?? []) {
			if (nodeId[0] !== "Node") continue;
			const n = props.nodes.find((n) => n.id === nodeId[1]);
			if (!n) return;
			startPositions.push([nodeId, { ...n.position }]);
		}

		const downPosition = getEventGraphPosition(downEvent);

		createPointerDrag({
			pointerId: downEvent.pointerId,
			startPosition: { x: downEvent.clientX, y: downEvent.clientY },
			callbacks: {
				onMove: (e) => {
					e.preventDefault();
					const movePosition = getEventGraphPosition(e);
					const delta = {
						x: movePosition.x - downPosition.x,
						y: movePosition.y - downPosition.y,
					};

					const positions = startPositions.map(
						([ref, startPosition]) =>
							[
								ref,
								{ x: startPosition.x + delta.x, y: startPosition.y + delta.y },
							] satisfies [any, any],
					);

					props.onSelectionDrag?.(positions);
					setState(
						IS.selectionDrag(
							downEvent.pointerId,
							downPosition,
							startPositions,
							positions,
						),
					);
				},
				onUp: (e) => {
					const upPosition = getEventGraphPosition(e);
					const delta = {
						x: upPosition.x - downPosition.x,
						y: upPosition.y - downPosition.y,
					};

					props.onSelectionDragEnd?.(
						startPositions.map(([ref, startPosition]) => [
							ref,
							{ x: startPosition.x + delta.x, y: startPosition.y + delta.y },
						]),
					);

					setState(IS.idle());
				},
			},
		});
	}

	return (
		<div
			ref={(el) => {
				if (!el) return;

				// Prevent default touch scroll/zoom
				el.addEventListener("touchmove", (e) => e.preventDefault(), {
					passive: false,
				});

				setRef(el);

				if (typeof props.ref === "function") {
					props.ref(el);
				} else if (props.ref) {
					(props.ref as any).current = el;
				}
			}}
			class={cx(
				"relative flex-1 flex flex-col gap-4 items-start w-full select-none overflow-hidden",
				isPanning(state()) && "cursor-grabbing",
			)}
			onPointerDown={(downEvent) => {
				if (downEvent.pointerType === "touch") {
					handleTouchPointerDown(downEvent);
					return;
				}

				if (downEvent.button === 0) {
					handleLeftClickCanvas(downEvent);
				} else if (downEvent.button === 2) {
					handleRightClickCanvas(downEvent);
				}
			}}
			onContextMenu={(e) => {
				if (!props.onContextMenu || isPanning(state())) return;
				e.preventDefault();
				const currentState = state();
				if (
					currentState.type !== "right-click" ||
					currentState.mode.type !== "pending"
				) {
					props.onContextMenu?.(e);
				}
			}}
		>
			<Connections
				connections={connections()}
				width={bounds.width ?? 0}
				height={bounds.height ?? 0}
				top={bounds.top ?? 0}
				left={bounds.left ?? 0}
			/>
			<ContextMenu>
				<div
					class="absolute inset-0 w-full h-full origin-top-left"
					style={{ transform: `scale(${graphCtx.scale})` }}
				>
					<div
						style={{
							transform: `translate(${(graphCtx.translate?.x ?? 0) * -1}px, ${
								(graphCtx.translate?.y ?? 0) * -1
							}px)`,
						}}
					>
						<For each={props.nodes}>
							{(node) => (
								<Show
									when={Option.getOrUndefined(props.getSchema(node.schema))}
								>
									{(schema) => (
										<NodeRoot
											{...node}
											graphBounds={{
												top: bounds.top ?? 0,
												left: bounds.left ?? 0,
											}}
											position={(() => {
												const positions = getSelectionDragPositions(state());
												if (!positions) return node.position;
												return (
													positions.find(
														(p) => p[0][0] === "Node" && p[0][1] === node.id,
													)?.[1] ?? node.position
												);
											})()}
											selected={
												props.selection?.some(
													(ref) => ref[0] === "Node" && ref[1] === node.id,
												) ||
												props.remoteSelections?.find((s) =>
													s.nodes.has(node.id),
												)?.colour
											}
											onPinDragStart={(e, type, id) => {
												if (state().type !== "idle") return false;

												setState(
													IS.ioDrag(e.pointerId, `${node.id}:${type}:${id}`),
												);

												return true;
											}}
											onPinDragEnd={() => {
												setState(IS.idle());
											}}
											onPinPointerUp={(e, type, id) => {
												const currentState = state();
												if (currentState.type !== "io-drag") return;
												if (e.pointerId !== currentState.pointerId) return;

												props.onConnectIO?.(
													currentState.ioRef,
													`${node.id}:${type}:${id}`,
												);
											}}
											onPinDoubleClick={(type, id) => {
												props.onDisconnectIO?.(`${node.id}:${type}:${id}`);
											}}
											connections={{
												in: [
													...Object.entries(
														props.connections?.[node.id]?.in ?? {},
													),
												].flatMap(([idStr, connections]) => {
													if (connections.length > 0) return IO.Id.make(idStr);
													return [];
												}),
												out: [
													...Object.entries(
														props.connections?.[node.id]?.out ?? {},
													),
												].flatMap(([idStr, connections]) => {
													if (connections.length > 0) return IO.Id.make(idStr);
													return [];
												}),
											}}
										>
											<ContextMenu.Trigger<ValidComponent>
												as={(cmProps) => (
													<NodeHeader
														{...cmProps}
														name={node.name}
														variant={schema().type}
														onPointerDown={(downEvent) => {
															if (downEvent.button === 0) {
																handleNodeHeaderDrag(downEvent, node);
															} else if (downEvent.button === 2) {
																downEvent.preventDefault();

																if (
																	!props.selection?.some(
																		(ref) =>
																			ref[0] === "Node" && ref[1] === node.id,
																	)
																)
																	props.onItemsSelected?.([["Node", node.id]]);
															}
														}}
													/>
												)}
											/>
										</NodeRoot>
									)}
								</Show>
							)}
						</For>
					</div>
				</div>
				<ContextMenu.Portal>
					<ContextMenu.Content<"div">
						class={cx(
							"absolute flex flex-col p-1 bg-gray-1 border border-gray-3 rounded-lg text-sm outline-none min-w-40 *:space-x-1",
							"origin-top-left ui-expanded:(animate-in fade-in zoom-in-95) ui-closed:(animate-out fade-out zoom-out-95)",
						)}
						onPointerDown={(e) => e.stopPropagation()}
					>
						<ContextMenu.Item
							onSelect={() => {
								props.onDeleteSelection?.();
							}}
							class="flex flex-row items-center bg-transparent w-full text-left p-1 rounded @hover-bg-white/10 active:bg-white/10 outline-none"
						>
							<IconMaterialSymbolsDeleteOutline />
							<span>Delete</span>
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Portal>
			</ContextMenu>
			<Show when={getAreaSelectionBounds(state())}>
				{(currentBounds) => {
					// Convert graph-space start position to screen-relative coordinates
					const startScreenPosition = () => {
						const bounds = currentBounds();
						if (!bounds) return { x: 0, y: 0 };
						return Viewport.canvasToViewportRelative(
							getViewport(),
							bounds.startGraphPosition,
						);
					};

					const currentScreenPosition = () => {
						const bounds = currentBounds();
						if (!bounds) return { x: 0, y: 0 };
						return bounds.currentScreenPosition;
					};

					return (
						<div
							class="absolute left-0 top-0 ring-1 ring-yellow-500 bg-yellow-500/10"
							style={{
								width: `${Math.abs(currentScreenPosition().x - startScreenPosition().x)}px`,
								height: `${Math.abs(currentScreenPosition().y - startScreenPosition().y)}px`,
								transform: `translate(${Math.min(
									startScreenPosition().x,
									currentScreenPosition().x,
								)}px, ${Math.min(startScreenPosition().y, currentScreenPosition().y)}px)`,
							}}
						/>
					);
				}}
			</Show>
			{props.children}
		</div>
	);
}

function Connections(props: {
	width: number;
	height: number;
	top: number;
	left: number;
	connections: Array<{
		from: { x: number; y: number };
		to: { x: number; y: number };
		opacity?: number;
	}>;
}) {
	const [ref, setRef] = createSignal<HTMLCanvasElement | null>(null);

	function render() {
		const canvas = ref();
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const scale = window.devicePixelRatio;
		const scaledWidth = Math.floor(props.width * scale);
		const scaledHeight = Math.floor(props.height * scale);

		if (canvas.width !== scaledWidth) canvas.width = scaledWidth;
		if (canvas.height !== scaledHeight) canvas.height = scaledHeight;

		ctx.scale(scale, scale);

		ctx.globalAlpha = 0.75;

		ctx.clearRect(0, 0, props.width, props.height);

		for (const { from, to, opacity } of props.connections) {
			const xDiff = from.x - to.x;
			const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			ctx.bezierCurveTo(
				from.x + cpMagnitude,
				from.y,
				to.x - cpMagnitude,
				to.y,
				to.x,
				to.y,
			);
			ctx.globalAlpha = 0.75 * (opacity ?? 1);
			ctx.strokeStyle = "white";
			ctx.stroke();
		}

		ctx.scale(1 / scale, 1 / scale);
	}

	createEffect(() => {
		render();
	});

	return <canvas ref={setRef} class="absolute inset-0 w-full h-full" />;
}
