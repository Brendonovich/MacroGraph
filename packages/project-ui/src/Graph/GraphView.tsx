import { Option } from "effect";
import { ContextMenu } from "@kobalte/core/context-menu";
import { type Graph, IO, Node, type Schema } from "@macrograph/project-domain";
import { createElementBounds } from "@solid-primitives/bounds";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { cx } from "cva";
import type { ValidComponent } from "solid-js";
import {
	batch,
	type ComponentProps,
	createEffect,
	createRoot,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";

import { isTouchDevice } from "../platform";
import type { NodeState } from "../State";
import { useGraphContext } from "./Context";
// import { useProjectService } from "../AppRuntime";
import { NodeHeader, NodeRoot } from "./Node";
// import { ProjectActions } from "../Project/Actions";
import type { GraphTwoWayConnections } from "./types";
import { Viewport } from "./viewport";

const PAN_THRESHOLD = 5;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const TOUCH_MOVE_THRESHOLD = 3;

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
		onContextMenu?(e: MouseEvent): void;
		onContextMenuClose?(): void;
		onDeleteSelection?(): void;
		onTranslateChange?(translate: { x: number; y: number }): void;
		onScaleChange?(zoom: number): void;
	} & Pick<ComponentProps<"div">, "ref" | "children">,
) {
	const [dragState, setDragState] = createSignal<
		| { type: "idle" }
		| {
				type: "dragArea";
				topLeft: { x: number; y: number };
				bottomRight: { x: number; y: number };
		  }
		| { type: "dragIO"; ioRef: IO.RefString; pointerId: number }
		| {
				type: "dragSelection";
				positions: Array<[Graph.ItemRef, { x: number; y: number }]>;
		  }
	>({ type: "idle" });

	const [isPanning, setIsPanning] = createSignal(false);
	const [rightClickPending, setRightClickPending] = createSignal(false);

	// NEW: Touch gesture state
	const gesture = {
		dragStarted: false,
		pointers: [] as Array<{
			pointerId: number;
			start: { x: number; y: number };
			current: { x: number; y: number };
		}>,
	};

	const graphCtx = useGraphContext();
	const [ref, setRef] = createSignal<HTMLDivElement | undefined>();
	const bounds = createElementBounds(ref);
	const mouse = createMousePosition();

	// Helper to get current viewport state
	function getViewport(): Viewport.Viewport {
		return {
			origin: graphCtx.translate ?? { x: 0, y: 0 },
			scale: graphCtx.scale,
		};
	}

	// Helper to get bounds (handling nullability from createElementBounds)
	function getBounds(): Viewport.Bounds {
		return { left: bounds.left ?? 0, top: bounds.top ?? 0 };
	}

	// Convert screen coordinates to canvas/graph coordinates
	function screenToGraph(screenPos: Viewport.Point): Viewport.Point {
		return Viewport.screenToCanvas(getViewport(), getBounds(), screenPos);
	}

	// Convert canvas/graph coordinates to screen coordinates
	function graphToScreen(graphPos: Viewport.Point): Viewport.Point {
		return Viewport.canvasToScreen(getViewport(), getBounds(), graphPos);
	}

	function handleZoom(delta: number, screenOrigin: Viewport.Point) {
		const viewport = getViewport();
		const b = getBounds();

		// Apply delta and clamp
		const newScale = Viewport.clampScale(
			viewport.scale + delta,
			MIN_ZOOM,
			MAX_ZOOM,
		);

		if (Math.abs(newScale - viewport.scale) < 0.001) return;

		const zoomDelta = newScale / viewport.scale;

		// Cursor position relative to viewport container
		const cursor = { x: screenOrigin.x - b.left, y: screenOrigin.y - b.top };

		const newViewport = Viewport.zoomAt(viewport, cursor, zoomDelta);

		props.onScaleChange?.(newViewport.scale);
		props.onTranslateChange?.(newViewport.origin);
	}

	function startTwoFingerGesture(
		left: {
			pointerId: number;
			start: { x: number; y: number };
			current: { x: number; y: number };
		},
		right: {
			pointerId: number;
			start: { x: number; y: number };
			current: { x: number; y: number };
		},
	) {
		// Track raw (unclamped) scale to allow pinching past limits
		// This prevents "sticking" at min/max zoom
		let rawScale = graphCtx.scale;

		createRoot((dispose) => {
			createEventListenerMap(window, {
				pointerup: (e) => {
					// End gesture if either pointer lifts
					if (
						left.pointerId === e.pointerId ||
						right.pointerId === e.pointerId
					) {
						gesture.dragStarted = false;
						gesture.pointers = [];
						dispose();
					}
				},

				pointermove: (e) => {
					// Only process if this is one of our two pointers
					if (
						e.pointerId !== left.pointerId &&
						e.pointerId !== right.pointerId
					) {
						return;
					}

					// 1. Calculate previous state using helper functions
					const lastDistance = Viewport.getDistance(
						left.current,
						right.current,
					);
					const lastMidpoint = Viewport.getMidpoint(
						left.current,
						right.current,
					);

					// 2. Update the pointer that moved
					if (left.pointerId === e.pointerId) {
						left.current = { x: e.clientX, y: e.clientY };
					} else if (right.pointerId === e.pointerId) {
						right.current = { x: e.clientX, y: e.clientY };
					}

					// 3. Calculate new state
					const newDistance = Viewport.getDistance(left.current, right.current);
					const newMidpoint = Viewport.getMidpoint(left.current, right.current);

					// 4. Calculate deltas
					const midpointDelta = {
						x: lastMidpoint.x - newMidpoint.x,
						y: lastMidpoint.y - newMidpoint.y,
					};

					// 5. Apply transformations
					let viewport = getViewport();
					const b = getBounds();

					// Apply zoom based on distance ratio (pinch-to-zoom)
					// Track raw scale to allow going past limits, then clamp for display
					if (lastDistance > 0 && newDistance > 0) {
						const scaleRatio = newDistance / lastDistance;
						rawScale = rawScale * scaleRatio;

						// Clamp for the actual displayed scale
						const clampedScale = Viewport.clampScale(
							rawScale,
							MIN_ZOOM,
							MAX_ZOOM,
						);

						if (Math.abs(clampedScale - viewport.scale) >= 0.001) {
							const actualScaleRatio = clampedScale / viewport.scale;

							// Zoom at the new midpoint (viewport-relative coordinates)
							const cursor = {
								x: newMidpoint.x - b.left,
								y: newMidpoint.y - b.top,
							};

							viewport = Viewport.zoomAt(viewport, cursor, actualScaleRatio);
						}
					}

					// Apply pan based on midpoint movement
					if (
						Math.abs(midpointDelta.x) > 0.5 ||
						Math.abs(midpointDelta.y) > 0.5
					) {
						viewport = Viewport.panByScreenDelta(viewport, midpointDelta);
					}

					// Update viewport state
					props.onScaleChange?.(viewport.scale);
					props.onTranslateChange?.(viewport.origin);
				},
			});
		});
	}

	function startSingleFingerDragArea(
		pointer: {
			pointerId: number;
			start: { x: number; y: number };
			current: { x: number; y: number };
		},
		startPos: { x: number; y: number },
	) {
		const topLeft = {
			x: startPos.x - (bounds.left ?? 0),
			y: startPos.y - (bounds.top ?? 0),
		};

		batch(() => {
			props.onItemsSelected?.([]);
			setDragState({ type: "dragArea", topLeft, bottomRight: topLeft });
		});

		createRoot((dispose) => {
			createEventListenerMap(window, {
				pointermove: (moveEvent) => {
					if (pointer.pointerId !== moveEvent.pointerId) return;

					setDragState((s) => {
						if (s.type !== "dragArea") return s;
						return {
							...s,
							bottomRight: {
								x: moveEvent.clientX - (bounds.left ?? 0),
								y: moveEvent.clientY - (bounds.top ?? 0),
							},
						};
					});
				},
				pointerup: (upEvent) => {
					if (pointer.pointerId !== upEvent.pointerId) return;

					gesture.dragStarted = false;
					gesture.pointers = [];
					setDragState({ type: "idle" });
					dispose();
				},
			});
		});
	}

	createEventListener(ref, "wheel", (e) => {
		e.preventDefault();

		let deltaX = e.deltaX;
		let deltaY = e.deltaY;
		let isTouchpad = false;

		if (Math.abs((e as any).wheelDeltaY) === Math.abs(e.deltaY) * 3) {
			deltaX = -(e as any).wheelDeltaX / 3;
			deltaY = -(e as any).wheelDeltaY / 3;
			isTouchpad = true;
		}

		if (e.ctrlKey) {
			const delta = ((isTouchpad ? 1 : -1) * deltaY) / 100;
			handleZoom(delta, { x: e.clientX, y: e.clientY });
		} else {
			const newViewport = Viewport.panByScreenDelta(getViewport(), {
				x: deltaX,
				y: deltaY,
			});
			props.onTranslateChange?.(newViewport.origin);
		}
	});

	const connections = () => {
		const ret: {
			from: { x: number; y: number };
			to: { x: number; y: number };
			opacity?: number;
		}[] = [];

		const draggingIO = (() => {
			const s = dragState();
			if (s.type === "dragIO") return s.ioRef;
		})();

		if (draggingIO) {
			const position = graphCtx.ioPositions.get(draggingIO);

			if (position) {
				// Mouse position in viewport-relative screen coordinates
				const mousePos = {
					x: mouse.x - (bounds.left ?? 0),
					y: mouse.y - (bounds.top ?? 0),
				};

				ret.push(
					draggingIO.includes(":o:")
						? { from: { ...position }, to: mousePos, opacity: 0.5 }
						: { to: { ...position }, from: mousePos, opacity: 0.5 },
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
			val.from.x = (val.from.x - viewport.origin.x) * viewport.scale;
			val.from.y = (val.from.y - viewport.origin.y) * viewport.scale;
			val.to.x = (val.to.x - viewport.origin.x) * viewport.scale;
			val.to.y = (val.to.y - viewport.origin.y) * viewport.scale;
		}

		//   if (name !== "ConnectIO") continue;

		//   const outPosition = ioPositions.get(
		//     `${Node.Id.make(Number(payload.output.nodeId))}:o:${
		//       payload.output.ioId
		//     }`,
		//   );
		//   if (!outPosition) continue;

		//   const inPosition = ioPositions.get(
		//     `${Node.Id.make(Number(payload.input.nodeId))}:i:${payload.input.ioId}`,
		//   );
		//   if (!inPosition) continue;

		//   ret.push({ from: outPosition, to: inPosition, opacity: 0.5 });
		// }

		return ret;
	};

	const getEventGraphPosition = (e: MouseEvent) =>
		graphCtx.getGraphPosition({ x: e.clientX, y: e.clientY });

	return (
		<div
			ref={(el) => {
				if (!el) return;

				// Prevent default touch scroll/zoom
				el.addEventListener("touchmove", (e) => e.preventDefault(), {
					passive: false,
				});

				// Set our ref
				setRef(el);

				// Handle props.ref if it exists
				if (typeof props.ref === "function") {
					props.ref(el);
				} else if (props.ref) {
					(props.ref as any).current = el;
				}
			}}
			class={cx(
				"relative flex-1 flex flex-col gap-4 items-start w-full select-none",
				isPanning() && "cursor-grabbing",
			)}
			onPointerDown={(downEvent) => {
				// ============ Touch Gesture Tracking ============
				if (downEvent.pointerType === "touch") {
					const pointer = {
						pointerId: downEvent.pointerId,
						start: { x: downEvent.clientX, y: downEvent.clientY },
						current: { x: downEvent.clientX, y: downEvent.clientY },
					};
					gesture.pointers.push(pointer);

					// If this is the second finger, start monitoring for two-finger gesture
					if (gesture.pointers.length === 2 && !gesture.dragStarted) {
						const left = gesture.pointers[0];
						const right = gesture.pointers[1];

						if (!left || !right) return;

						// Create root to monitor for movement
						createRoot((disposeMonitor) => {
							createEventListener(window, "pointermove", (moveEvent) => {
								if (gesture.dragStarted) {
									disposeMonitor();
									return;
								}

								// Update current position for the moving pointer
								const movingPointer = gesture.pointers.find(
									(p) => p.pointerId === moveEvent.pointerId,
								);
								if (!movingPointer) return;

								const diff = {
									x: movingPointer.start.x - moveEvent.clientX,
									y: movingPointer.start.y - moveEvent.clientY,
								};

								// Check movement threshold
								if (
									Math.abs(diff.x) > TOUCH_MOVE_THRESHOLD ||
									Math.abs(diff.y) > TOUCH_MOVE_THRESHOLD
								) {
									disposeMonitor();
									gesture.dragStarted = true;

									// Start two-finger gesture
									startTwoFingerGesture(left, right);
								}
							});

							// Clean up if pointers lift before threshold
							createEventListener(window, "pointerup", (e) => {
								if (
									left.pointerId === e.pointerId ||
									right.pointerId === e.pointerId
								) {
									gesture.pointers = [];
									disposeMonitor();
								}
							});
						});

						// Don't process further - we're waiting for two-finger gesture
						return;
					}

					// If this is the first finger, wait briefly for a possible second finger
					// before starting single-finger drag area selection
					if (gesture.pointers.length === 1) {
						createRoot((disposeMonitor) => {
							const startPos = { x: downEvent.clientX, y: downEvent.clientY };

							createEventListenerMap(window, {
								pointermove: (moveEvent) => {
									// Only track this pointer
									if (moveEvent.pointerId !== downEvent.pointerId) return;

									// If gesture already started (two-finger), abort
									if (gesture.dragStarted) {
										disposeMonitor();
										return;
									}

									// If a second finger was added, don't start drag area
									if (gesture.pointers.length > 1) {
										disposeMonitor();
										return;
									}

									const diff = {
										x: startPos.x - moveEvent.clientX,
										y: startPos.y - moveEvent.clientY,
									};

									// Check movement threshold for single-finger drag
									if (
										Math.abs(diff.x) > TOUCH_MOVE_THRESHOLD ||
										Math.abs(diff.y) > TOUCH_MOVE_THRESHOLD
									) {
										disposeMonitor();
										gesture.dragStarted = true;

										// Start single-finger drag area selection
										startSingleFingerDragArea(pointer, startPos);
									}
								},
								pointerup: (upEvent) => {
									if (upEvent.pointerId !== downEvent.pointerId) return;
									gesture.pointers = [];
									disposeMonitor();
								},
							});
						});

						// Don't process further - we're monitoring for gesture type
						return;
					}

					// More than 2 fingers - ignore
					return;
				}
				// ============ END Touch Gesture Tracking ============

				if (downEvent.button === 0) {
					downEvent.preventDefault();
					props.onContextMenuClose?.();
					const topLeft = {
						x: downEvent.clientX - (bounds.left ?? 0),
						y: downEvent.clientY - (bounds.top ?? 0),
					};

					batch(() => {
						props.onItemsSelected?.([]);
						setDragState((s) => {
							if (s.type !== "idle") return s;

							createRoot((dispose) => {
								const timeout = setTimeout(() => {
									if (isTouchDevice) {
										props.onContextMenu?.(downEvent);
									}
								}, 300);

								createEventListenerMap(window, {
									pointermove: (moveEvent) => {
										if (downEvent.pointerId !== moveEvent.pointerId) return;
										clearTimeout(timeout);

										setDragState((s) => {
											if (s.type !== "dragArea") return s;
											return {
												...s,
												bottomRight: {
													x: moveEvent.clientX - (bounds.left ?? 0),
													y: moveEvent.clientY - (bounds.top ?? 0),
												},
											};
										});
									},
									pointerup: (upEvent) => {
										if (downEvent.pointerId !== upEvent.pointerId) return;

										dispose();
									},
								});

								onCleanup(() => {
									try {
										clearTimeout(timeout);
									} catch {}
									setDragState({ type: "idle" });
								});
							});

							return { type: "dragArea", topLeft, bottomRight: topLeft };
						});
					});
				} else if (downEvent.button === 2) {
					downEvent.preventDefault();
					setRightClickPending(true);

					const startScreenPosition = {
						x: downEvent.clientX,
						y: downEvent.clientY,
					};
					const startTranslate = graphCtx.translate ?? { x: 0, y: 0 };
					let isDragging = false;

					createRoot((dispose) => {
						const handlePointerMove = (moveEvent: PointerEvent) => {
							if (downEvent.pointerId !== moveEvent.pointerId) return;

							const distance = Math.hypot(
								moveEvent.clientX - startScreenPosition.x,
								moveEvent.clientY - startScreenPosition.y,
							);

							if (distance > PAN_THRESHOLD) {
								isDragging = true;
								setIsPanning(true);
								setRightClickPending(false);

								const screenDelta = {
									x: startScreenPosition.x - moveEvent.clientX,
									y: startScreenPosition.y - moveEvent.clientY,
								};

								const newViewport = Viewport.panByScreenDelta(
									{ origin: startTranslate, scale: graphCtx.scale },
									screenDelta,
								);
								props.onTranslateChange?.(newViewport.origin);
							}
						};

						const handlePointerUp = (upEvent: PointerEvent) => {
							if (downEvent.pointerId !== upEvent.pointerId) return;

							if (!isDragging) {
								props.onContextMenu?.(upEvent);
							}

							setRightClickPending(false);
							dispose();
						};

						createEventListenerMap(window, {
							pointermove: handlePointerMove,
							pointerup: handlePointerUp,
						});

						onCleanup(() => {
							setIsPanning(false);
							setRightClickPending(false);
						});
					});
				}
			}}
			onContextMenu={(e) => {
				if (!props.onContextMenu || isPanning()) return;
				e.preventDefault();
				if (!rightClickPending()) {
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
					class="absolute inset-0 origin-top-left"
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
												const ds = dragState();

												if (ds.type !== "dragSelection") return node.position;
												return (
													ds.positions.find(
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
												if (dragState().type !== "idle") return false;

												setDragState({
													type: "dragIO",
													ioRef: `${node.id}:${type}:${id}`,
													pointerId: e.pointerId,
												});

												return true;
											}}
											onPinDragEnd={() => {
												setDragState({ type: "idle" });
											}}
											onPinPointerUp={(e, type, id) => {
												const dragIO = (() => {
													const s = dragState();
													if (s.type === "dragIO") return s;
												})();
												if (!dragIO || e.pointerId !== dragIO.pointerId) return;

												props.onConnectIO?.(
													dragIO.ioRef,
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
																downEvent.stopPropagation();

																if (downEvent.shiftKey) {
																	const index = props.selection?.findIndex(
																		(ref) =>
																			ref[0] === "Node" && ref[1] === node.id,
																	);
																	if (index !== -1) {
																		props.onItemsSelected?.(
																			props.selection?.filter(
																				(ref) =>
																					ref[0] === "Node" &&
																					ref[1] === node.id,
																			) ?? [],
																		);
																	} else {
																		props.onItemsSelected?.([
																			...(props.selection ?? []),
																			["Node", node.id],
																		]);
																	}
																} else if ((props.selection?.length ?? 0) <= 1)
																	props.onItemsSelected?.([["Node", node.id]]);

																const startPositions: Array<
																	[Graph.ItemRef, { x: number; y: number }]
																> = [];
																for (const nodeId of props.selection ?? []) {
																	if (nodeId[0] !== "Node") continue;

																	const node = props.nodes.find(
																		(n) => n.id === nodeId[1],
																	);
																	if (!node) return;
																	startPositions.push([
																		nodeId,
																		{ ...node.position },
																	]);
																}

																const downPosition =
																	getEventGraphPosition(downEvent);

																createRoot((dispose) => {
																	createEventListenerMap(window, {
																		pointermove: (moveEvent) => {
																			if (
																				downEvent.pointerId !==
																				moveEvent.pointerId
																			)
																				return;

																			moveEvent.preventDefault();

																			const movePosition =
																				getEventGraphPosition(moveEvent);

																			const delta = {
																				x: movePosition.x - downPosition.x,
																				y: movePosition.y - downPosition.y,
																			};

																			const positions = startPositions.map(
																				([ref, startPosition]) =>
																					[
																						ref,
																						{
																							x: startPosition.x + delta.x,
																							y: startPosition.y + delta.y,
																						},
																					] satisfies [any, any],
																			);

																			props.onSelectionDrag?.(positions);

																			setDragState({
																				type: "dragSelection",
																				positions,
																			});
																		},
																		pointerup: (upEvent) => {
																			if (
																				downEvent.pointerId !==
																				upEvent.pointerId
																			)
																				return;

																			const upPosition =
																				getEventGraphPosition(upEvent);

																			const delta = {
																				x: upPosition.x - downPosition.x,
																				y: upPosition.y - downPosition.y,
																			};

																			props.onSelectionDragEnd?.(
																				startPositions.map(
																					([ref, startPosition]) => [
																						ref,
																						{
																							x: startPosition.x + delta.x,
																							y: startPosition.y + delta.y,
																						},
																					],
																				),
																			);

																			setDragState({ type: "idle" });

																			dispose();
																		},
																	});
																});
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
			<Show
				when={(() => {
					const s = dragState();
					if (s.type === "dragArea") return s;
				})()}
			>
				{(dragState) => (
					<div
						class="absolute left-0 top-0 ring-1 ring-yellow-500 bg-yellow-500/10"
						style={{
							width: `${Math.abs(
								dragState().bottomRight.x - dragState().topLeft.x,
							)}px`,
							height: `${Math.abs(
								dragState().bottomRight.y - dragState().topLeft.y,
							)}px`,
							transform: `translate(${Math.min(
								dragState().topLeft.x,
								dragState().bottomRight.x,
							)}px, ${Math.min(
								dragState().topLeft.y,
								dragState().bottomRight.y,
							)}px)`,
						}}
					/>
				)}
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

		// Only set if changed
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
