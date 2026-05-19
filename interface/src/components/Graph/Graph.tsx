import {
	type Graph as GraphModel,
	type Size,
	type XY,
	getCommentBoxesInRect,
	getNodesInRect,
	pinIsInput,
	pinIsOutput,
	graphRefOf,
} from "@macrograph/runtime";
import { createBodyCursor } from "@solid-primitives/cursor";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import * as Solid from "solid-js";
import { createStore } from "solid-js/store";
import { isMobile } from "@solid-primitives/platform";
import clsx from "clsx";

import { type SchemaMenuOpenState, useInterfaceContext } from "../../context";
import { isCtrlEvent } from "../../util";
import { ConnectionRenderer } from "../Graph";
import { CommentBox } from "./CommentBox";
import {
	type GraphContext,
	GraphContextProvider,
	coerceGraphScale,
	type GraphViewState,
	toGraphSpace,
	toScreenSpace,
} from "./Context";
import { DotGrid } from "./DotGrid";
import { Node } from "./Node";
import { GRID_SIZE } from "./util";
import { isPointerOverGraphViewport } from "../../mosaicLayout";
import { isPaneResizing, onPaneResizeEnd } from "../../paneResizeSession";
import { getRemoteCursors, broadcastCursorPosition, getFollowUserId, getRemotePinDrags, getRemoteSelectionBoxes, broadcastPinDrag, broadcastSelectionBox } from "../../remoteHistorySync";

type PanState = "none" | "waiting" | "active";

/** 0.2 → 1.6 (×2 each step: 0.2, 0.4, 0.8, 1.6) */
const MAX_ZOOM_IN = 1.6;
const MAX_ZOOM_OUT = 5;
const ZOOM_STEP = 1.05;

interface Props extends Solid.ComponentProps<"div"> {
	state: GraphViewState;
	graph: GraphModel;
	mosaicGroupId?: string;
	onGraphDrag?(): void;
	onMouseDown?: Solid.JSX.EventHandler<HTMLDivElement, MouseEvent>;
	onMouseUp?: Solid.JSX.EventHandler<HTMLDivElement, MouseEvent>;
	onScaleChange(scale: number): void;
	onTranslateChange(translate: XY): void;
	onSizeChange(size: { width: number; height: number }): void;
	onBoundsChange(bounds: XY): void;
}

type State = {
	size: Size;
	bounds: XY;
};

export const Graph = (props: Props) => {
	const [ref, setRef] = Solid.createSignal<HTMLDivElement | undefined>();
	const interfaceCtx = useInterfaceContext();

	const model = () => props.graph;
	const graphRef = () => graphRefOf(model());

	const viewState = (): GraphViewState => ({
		...props.state,
		scale: coerceGraphScale(props.state.scale),
	});

	const [state, setState] = createStore<State>({
		size: { width: 0, height: 0 },
		bounds: { x: 0, y: 0 },
	});

	const cursorList = Solid.createMemo(() => getRemoteCursors());
	const remotePinDragList = Solid.createMemo(() => getRemotePinDrags());
	const remoteSelectionBoxList = Solid.createMemo(() => getRemoteSelectionBoxes());

	let resizeRaf: number | undefined;

	function onResize() {
		if (resizeRaf !== undefined) return;
		resizeRaf = requestAnimationFrame(() => {
			resizeRaf = undefined;
			applyResize();
		});
	}

	function applyResize() {
		if (isPaneResizing()) return;

		const rect = ref()!.getBoundingClientRect()!;

		const boundsValue = { x: rect.left, y: rect.top };
		props.onBoundsChange(boundsValue);
		setState("bounds", boundsValue);

		const sizeValue = { width: rect.width, height: rect.height };
		props.onSizeChange(sizeValue);
		setState("size", sizeValue);
	}

	function updateScale(delta: number, screenOrigin: XY) {
		const startGraphOrigin = toGraphSpace(
			screenOrigin,
			state.bounds,
			props.state,
		);

		props.onScaleChange(
			Math.min(
				Math.max(
					1 / MAX_ZOOM_OUT,
					viewState().scale * Math.pow(ZOOM_STEP, delta),
				),
				MAX_ZOOM_IN,
			),
		);

		const endGraphOrigin = toScreenSpace(
			startGraphOrigin,
			state.bounds,
			props.state,
		);

		const { translate, scale } = props.state;

		props.onTranslateChange({
			x: translate.x + (endGraphOrigin.x - screenOrigin.x) / scale,
			y: translate.y + (endGraphOrigin.y - screenOrigin.y) / scale,
		});
	}

	const [pan, setPan] = Solid.createSignal<PanState>("none");

	Solid.onMount(() => {
		createEventListener(window, "resize", onResize);
		createResizeObserver(ref, onResize);

		Solid.onCleanup(() => {
			if (resizeRaf !== undefined) cancelAnimationFrame(resizeRaf);
		});

		onPaneResizeEnd(() => {
			if (ref()) applyResize();
		});

		if (!isMobile)
			createEventListener(ref, "gesturestart", () => {
				let lastScale = 1;

				Solid.createRoot((dispose) => {
					createEventListenerMap(() => ref() ?? [], {
						gestureend: dispose,
						gesturechange: (e: any) => {
							let scale = e.scale;
							let direction = 1;

							if (scale < 1) {
								direction = -1;
								scale = 1 / scale;
								if (lastScale < 1) lastScale = 1 / lastScale;
							}

							updateScale((scale - lastScale) * direction, {
								x: e.clientX,
								y: e.clientY,
							});

							lastScale = e.scale;
						},
					});
				});
			});
	});

	createBodyCursor(() => pan() === "active" && "grabbing");

	// using onWheel directly was broken in a recent chromium update -_-
	if (!isMobile)
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

				updateScale(delta, {
					x: e.clientX,
					y: e.clientY,
				});
			} else
				props.onTranslateChange({
					x: props.state.translate.x + deltaX,
					y: props.state.translate.y + deltaY,
				});
		});

	createEventListener(window, "keydown", (e) => {
		const target = e.target;
		if (
			target instanceof HTMLElement &&
			(target.closest(".cm-editor") || target.isContentEditable)
		) {
			return;
		}

		switch (e.code) {
			case "BracketLeft": {
				const fold = (e.metaKey || e.shiftKey) && e.altKey;

				if (fold) {
					const { selectedItemIds } = props.state;

					for (const selectedItemId of selectedItemIds) {
						if (selectedItemId.type !== "node") continue;

						const node = model().nodes.get(selectedItemId.id);
						if (!node) return;

						interfaceCtx.execute("setNodeFoldPins", {
							...graphRef(),
							nodeId: node.id,
							foldPins: true,
						});
					}
				}

				return;
			}
			case "BracketRight": {
				const fold = (e.metaKey || e.shiftKey) && e.altKey;

				if (fold) {
					const { selectedItemIds } = props.state;

					for (const selectedItemId of selectedItemIds) {
						if (selectedItemId.type !== "node") continue;

						const node = model().nodes.get(selectedItemId.id);
						if (!node) return;

						interfaceCtx.execute("setNodeFoldPins", {
							...graphRef(),
							nodeId: node.id,
							foldPins: false,
						});
					}
				}

				return;
			}
			default:
				return;
		}
	});

	const [dragArea, setDragArea] = Solid.createSignal<DOMRect | null>(null);

	const ctx: GraphContext = {
		model,
		get state() {
			return viewState();
		},
		offset: state.bounds,
		toGraphSpace: (xy) => toGraphSpace(xy, state.bounds, viewState()),
		toScreenSpace: (xy) => toScreenSpace(xy, state.bounds, viewState()),
	};

	const gesture = {
		dragStarted: false,
		pointers: [] as Array<{
			pointerId: number;
			start: XY;
			current: XY;
			button: number;
		}>,
	};

	function unselectAllEphemeral() {
		interfaceCtx.execute(
			"setGraphSelection",
			{ ...graphRef(), selection: [] },
			{ ephemeral: true },
		);
	}

	function createTranslateSession(initialClientXY: XY) {
		const oldTranslate = { ...props.state.translate };

		return {
			stop: () => {
				setPan("none");
			},
			updateControlPoint: (clientXY: XY) => {
				const MOVE_BUFFER = 3;

				const diff = {
					x: initialClientXY.x - clientXY.x,
					y: initialClientXY.y - clientXY.y,
				};

				if (Math.abs(diff.x) < MOVE_BUFFER && Math.abs(diff.y) < MOVE_BUFFER)
					return;

				setPan("active");

				const { scale } = props.state;

				props.onTranslateChange({
					x: (diff.x + oldTranslate.x * scale) / scale,
					y: (diff.y + oldTranslate.y * scale) / scale,
				});
			},
		};
	}

	function createDragAreaSession(initialClientXY: XY) {
		const start = ctx.toGraphSpace({
			x: initialClientXY.x,
			y: initialClientXY.y,
		});
		const prevSelection = [...props.state.selectedItemIds];

		if (interfaceCtx.state.status === "schemaMenuOpen")
			interfaceCtx.setState({ status: "idle" });

		unselectAllEphemeral();

		Solid.createRoot((dispose) => {
			const getItems = (e: MouseEvent) => {
				const end = ctx.toGraphSpace({
					x: e.clientX,
					y: e.clientY,
				});

				const xSide: "l" | "r" = start.x < end.x ? "r" : "l";
				const ySide: "u" | "d" = start.y < end.y ? "d" : "u";

				const width = Math.abs(end.x - start.x);
				const height = Math.abs(end.y - start.y);

				const x = xSide === "r" ? start.x : start.x - width;
				const y = ySide === "d" ? start.y : start.y - height;

				const rect = new DOMRect(x, y, width, height);

				const items = [
					...[
						...getNodesInRect(
							model().nodes.values(),
							rect,
							(node) => interfaceCtx.itemSizes.get(node),
							GRID_SIZE * 2,
						),
					].map((n) => ({ id: n.id, type: "node" as const })),
					...[
						...getCommentBoxesInRect(
							model().commentBoxes.values(),
							rect,
							GRID_SIZE * 2,
						),
					].map((b) => ({
						id: b.id,
						type: "commentBox" as const,
					})),
				];

				return [items, rect] as const;
			};

			let didMove = false;

			createEventListenerMap(window, {
				pointerup: (e) => {
					dispose();

					broadcastSelectionBox({
						id: "",
						...graphRef(),
						x: 0,
						y: 0,
						width: 0,
						height: 0,
					});

					if (!didMove) {
						if (prevSelection.length !== 0)
							interfaceCtx.execute("setGraphSelection", {
								...graphRef(),
								selection: [],
								prev: prevSelection,
							});
					} else {
						const [items] = getItems(e);
						setDragArea(null);

						if (items.length === 0) {
							interfaceCtx.setState({ status: "idle" });
							if (prevSelection.length > 0)
								interfaceCtx.execute("setGraphSelection", {
									...graphRef(),
									selection: [],
									prev: prevSelection,
								});
						} else {
							interfaceCtx.execute("setGraphSelection", {
								...graphRef(),
								selection: items,
								prev: prevSelection,
							});
						}
					}
				},
				pointermove: (e) => {
					didMove = true;

					const [items, rect] = getItems(e);
					setDragArea(rect);

					interfaceCtx.execute(
						"setGraphSelection",
						{ ...graphRef(), selection: items },
						{ ephemeral: true },
					);

					broadcastSelectionBox({
						id: "",
						...graphRef(),
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height,
					});
				},
			});
		});
	}

	// Follow a user's cursor (auto-pan camera with smooth lerp, auto-switch graph)
	const lastFollowGraphRef = { kind: model().kind, id: model().id };
	const isFocusedPane = () =>
		!props.mosaicGroupId ||
		props.mosaicGroupId === interfaceCtx.mosaicState.focusedGroupId;
	Solid.createEffect(() => {
		const followId = getFollowUserId();
		if (!followId || !isFocusedPane()) return;

		let rafId: number;
		const loop = () => {
			const cursors = getRemoteCursors();
			const ref = graphRef();
			const target = cursors.find(
				(c) =>
					c.id === followId &&
					c.graphKind === ref.graphKind &&
					c.graphId === ref.graphId,
			);

			if (target) {
				lastFollowGraphRef.kind = ref.graphKind;
				lastFollowGraphRef.id = ref.graphId;
				const followPos = target.viewportCenter ?? target.position;
				const screenPos = toScreenSpace(followPos, state.bounds, props.state);
				const centerX = state.size.width / 2;
				const centerY = state.size.height / 2;

				const targetTranslateX =
					props.state.translate.x + (screenPos.x - centerX) / props.state.scale;
				const targetTranslateY =
					props.state.translate.y + (screenPos.y - centerY) / props.state.scale;

				const lerpFactor = 0.08;
				props.onTranslateChange({
					x: props.state.translate.x + (targetTranslateX - props.state.translate.x) * lerpFactor,
					y: props.state.translate.y + (targetTranslateY - props.state.translate.y) * lerpFactor,
				});
			} else {
				const other = cursors.find(
					(c) =>
						c.id === followId &&
						(c.graphKind !== ref.graphKind || c.graphId !== ref.graphId),
				);
				if (
					other &&
					(other.graphKind !== lastFollowGraphRef.kind ||
						other.graphId !== lastFollowGraphRef.id)
				) {
					lastFollowGraphRef.kind = other.graphKind;
					lastFollowGraphRef.id = other.graphId;
					const graph = interfaceCtx.core.project.getGraphByKind(
						other.graphKind,
						other.graphId,
					);
					if (graph) interfaceCtx.selectGraph(graph);
				}
			}

			rafId = requestAnimationFrame(loop);
		};

		rafId = requestAnimationFrame(loop);

		Solid.onCleanup(() => cancelAnimationFrame(rafId));
	});

	const cursorRaf = { current: 0 as unknown as ReturnType<typeof requestAnimationFrame> | null };
	const sendCursor = (payload: {
		id?: string;
		graphKind: import("@macrograph/runtime").GraphKind;
		graphId: number;
		position: { x: number; y: number };
		viewportCenter?: { x: number; y: number };
	}) => {
		if (cursorRaf.current != null) cancelAnimationFrame(cursorRaf.current);
		cursorRaf.current = requestAnimationFrame(() => {
			cursorRaf.current = null;
			broadcastCursorPosition(payload);
		});
	};

		// Broadcast pin drag state to remote clients (RAF-batched)
	const mousePos = createMousePosition();
	const pinDragRaf = { current: 0 as unknown as ReturnType<typeof requestAnimationFrame> | null };
	Solid.createEffect(() => {
		const st = interfaceCtx.state;
		if (st.status !== "pinDragMode" || st.state.status !== "draggingPin") {
			if (pinDragRaf.current) cancelAnimationFrame(pinDragRaf.current);
			pinDragRaf.current = requestAnimationFrame(() => {
				pinDragRaf.current = null;
				broadcastPinDrag({
					id: "",
					...graphRef(),
					pinNodeId: 0,
					pinId: "",
					isOutput: false,
					position: { x: -99999, y: -99999 },
				});
			});
			return;
		}

		const pin = st.pin;
		const graphSpace = ctx.toGraphSpace({ x: mousePos.x, y: mousePos.y });

		if (pinDragRaf.current != null) cancelAnimationFrame(pinDragRaf.current);
		pinDragRaf.current = requestAnimationFrame(() => {
			pinDragRaf.current = null;
			broadcastPinDrag({
				id: "",
				...graphRef(),
				pinNodeId: pin.node.id,
				pinId: pin.id,
				isOutput: pinIsOutput(pin),
				position: graphSpace,
			});
		});
	});

	return (
		<GraphContextProvider value={ctx}>
			<div
				{...props}
				data-graph-viewport
				class={clsx(
					"flex-1 w-full relative overflow-hidden bg-mg-graph",
					props.class,
				)}
				ref={(ref) => {
					ref.addEventListener("touchmove", (e) => e.preventDefault(), {
						passive: false,
					});

					setRef(ref);
				}}
				onPointerMove={(e) => {
					const graphSpace = ctx.toGraphSpace({ x: e.clientX, y: e.clientY });
					sendCursor?.({
						id: "",
						...graphRef(),
						position: graphSpace,
						viewportCenter: {
							x: (state.size.width / 2) / props.state.scale + props.state.translate.x,
							y: (state.size.height / 2) / props.state.scale + props.state.translate.y,
						},
					});
				}}
				onPointerLeave={(e) => {
					const { clientX, clientY } = e;
					requestAnimationFrame(() => {
						if (isPointerOverGraphViewport(clientX, clientY)) return;
						sendCursor?.({
							id: "",
							...graphRef(),
							position: { x: -99999, y: -99999 },
						});
					});
				}}
				onPointerUp={(e) => {
					if (e.pointerType === "touch") {
						gesture.pointers = gesture.pointers.filter(
							(p) => p.pointerId !== e.pointerId,
						);
					}

					if (e.button === 2) {
						if (pan() === "active") return;

						const state: SchemaMenuOpenState = {
							status: "schemaMenuOpen",
							position: {
								x: e.clientX,
								y: e.clientY,
							},
							...graphRef(),
						};

						if (interfaceCtx.state.status === "connectionAssignMode")
							interfaceCtx.setState({ ...interfaceCtx.state, state });
						else interfaceCtx.setState(state);
					} else if (
						(e.button === 0 ||
							(e.pointerType === "touch" && gesture.pointers.length === 0)) &&
						interfaceCtx.state.status === "pinDragMode"
					) {
						if (
							interfaceCtx.state.state.status === "draggingPin" &&
							interfaceCtx.state.state.autoconnectIO
						) {
							const autoconnectIORef = interfaceCtx.state.state.autoconnectIO;

							const thisPin = interfaceCtx.state.pin;
							const autoconnectIO = model()
								.pinFromRef(autoconnectIORef)
								.toNullable();
							if (!autoconnectIO) return;

							if (pinIsOutput(thisPin) && pinIsInput(autoconnectIO))
								interfaceCtx.execute("connectIO", {
									...graphRef(),
									out: { nodeId: thisPin.node.id, pinId: thisPin.id },
									in: {
										nodeId: autoconnectIO.node.id,
										pinId: autoconnectIO.id,
									},
								});
							else if (pinIsInput(thisPin) && pinIsOutput(autoconnectIO))
								interfaceCtx.execute("connectIO", {
									...graphRef(),
									out: {
										nodeId: autoconnectIO.node.id,
										pinId: autoconnectIO.id,
									},
									in: { nodeId: thisPin.node.id, pinId: thisPin.id },
								});

							interfaceCtx.setState({ status: "idle" });
						} else if (isCtrlEvent(e)) {
							interfaceCtx.setState({
								...interfaceCtx.state,
								status: "pinDragMode",
								state: {
									status: "schemaMenuOpen",
									position: { x: e.clientX, y: e.clientY },
									...graphRef(),
								},
							});
						} else {
							interfaceCtx.setState({ status: "idle" });
						}
					}
				}}
				onPointerDown={(e) => {
					setTimeout(() => {
						if (gesture.dragStarted) return;
						const { pointerId } = e;

						gesture.pointers.push({
							pointerId: e.pointerId,
							start: {
								x: e.clientX,
								y: e.clientY,
							},
							current: {
								x: e.clientX,
								y: e.clientY,
							},
							button: e.button,
						});

						if (e.pointerType === "touch") {
							if (interfaceCtx.state.status === "pinDragMode") {
								interfaceCtx.setState({ status: "idle" });
							} else {
								Solid.createRoot((dispose) => {
									const start = { x: e.clientX, y: e.clientY };

									createEventListenerMap(window, {
										pointerup: () => {
											if (gesture.pointers.length === 0) {
												unselectAllEphemeral();
											}

											dispose();
										},
										pointermove: (e) => {
											if (gesture.dragStarted || e.pointerId !== pointerId)
												return;

											const diff = {
												x: start.x - e.clientX,
												y: start.y - e.clientY,
											};

											if (Math.abs(diff.x) > 3 || Math.abs(diff.y) > 3) {
												gesture.dragStarted = true;

												const pointers = [...gesture.pointers];

												Solid.createRoot((dispose) => {
													createEventListener(window, "pointerup", (e) => {
														if (
															pointers.find((p) => p.pointerId === e.pointerId)
														) {
															gesture.dragStarted = false;
															dispose();
														}
													});
												});

												if (gesture.pointers.length === 1) {
													createDragAreaSession(start);
												} else if (gesture.pointers.length === 2) {
													const left = gesture.pointers[0]!;
													const right = gesture.pointers[1]!;

													const startCenter = {
														x: (left.start.x + right.start.x) / 2,
														y: (left.start.y + right.start.y) / 2,
													};

													const translateSession =
														createTranslateSession(startCenter);

													Solid.createRoot((dispose) => {
														createEventListenerMap(window, {
															pointerup: (e) => {
																if (
																	left.pointerId !== e.pointerId &&
																	right.pointerId !== e.pointerId
																)
																	return;

																dispose();
																translateSession.stop();
															},
															pointermove: (e) => {
																const lastPointerDistance = Math.sqrt(
																	(left.current.x - right.current.x) ** 2 +
																		(left.current.y - right.current.y) ** 2,
																);
																const lastCenter = {
																	x: (left.current.x + right.current.x) / 2,
																	y: (left.current.y + right.current.y) / 2,
																};

																if (left.pointerId === e.pointerId) {
																	left.current = { x: e.clientX, y: e.clientY };
																} else if (right.pointerId === e.pointerId) {
																	right.current = {
																		x: e.clientX,
																		y: e.clientY,
																	};
																}

																const newCenter = {
																	x: (left.current.x + right.current.x) / 2,
																	y: (left.current.y + right.current.y) / 2,
																};

																const newPointerDistance = Math.sqrt(
																	(left.current.x - right.current.x) ** 2 +
																		(left.current.y - right.current.y) ** 2,
																);

																const newCenterGraphPosition =
																	ctx.toGraphSpace(newCenter);

																updateScale(
																	((newPointerDistance - lastPointerDistance) /
																		15) *
																		props.state.scale,
																	newCenter,
																);

																const newCenterAfterScaling = ctx.toScreenSpace(
																	newCenterGraphPosition,
																);

																const { translate, scale } = props.state;
																props.onTranslateChange({
																	x:
																		translate.x +
																		(lastCenter.x - newCenterAfterScaling.x) /
																			scale,
																	y:
																		translate.y +
																		(lastCenter.y - newCenterAfterScaling.y) /
																			scale,
																});
															},
														});
													});
												}
											}
										},
									});
								});
							}
						} else {
							switch (e.button) {
								case 0: {
									createDragAreaSession({ x: e.clientX, y: e.clientY });

									break;
								}
								case 2: {
									setPan("waiting");

									const translateSession = createTranslateSession({
										x: e.clientX,
										y: e.clientY,
									});

									Solid.createRoot((dispose) => {
										Solid.createEffect(() => {
											if (pan() === "active")
												interfaceCtx.setState({ status: "idle" });
										});

										createEventListenerMap(window, {
											pointerup: () => {
												dispose();
												translateSession.stop();
											},
											pointermove: (e) => {
												translateSession.updateControlPoint({
													x: e.clientX,
													y: e.clientY,
												});
											},
										});
									});

									break;
								}
							}
						}
					}, 1);
				}}
			>
				<DotGrid
					width={() => state.size.width}
					height={() => state.size.height}
				/>
				<ConnectionRenderer
					graphBounds={{
						get x() {
							return state.bounds.x;
						},
						get y() {
							return state.bounds.y;
						},
						get width() {
							return state.size.width;
						},
						get height() {
							return state.size.height;
						},
					}}
				/>
				<div
					class="absolute inset-0 text-white origin-top-left overflow-hidden"
					style={{
						transform: `scale(${viewState().scale})`,
						width: `${MAX_ZOOM_OUT * 100}%`,
						height: `${MAX_ZOOM_OUT * 100}%`,
					}}
				>
					<div
						class="origin-[0,0]"
						style={{
							transform: `translate(${props.state.translate.x * -1}px, ${
								props.state.translate.y * -1
							}px)`,
						}}
					>
						<Solid.For each={[...model().commentBoxes.values()]}>
							{(box) => (
								<CommentBox
									box={box}
									onSelected={(ephemeral) =>
										interfaceCtx.execute(
											"setGraphSelection",
											{
												...graphRef(),
												selection: [{ type: "commentBox", id: box.id }],
											},
											{ ephemeral },
										)
									}
								/>
							)}
						</Solid.For>
						<Solid.For each={[...model().nodes.values()]}>
							{(node) => (
								<Node
									node={node}
									onSelected={(ephemeral) =>
										interfaceCtx.execute(
											"setGraphSelection",
											{
												...graphRef(),
												selection: [{ type: "node", id: node.id }],
											},
											{ ephemeral },
										)
									}
								/>
							)}
						</Solid.For>
						<Solid.Show when={dragArea()}>
							{(dragArea) => (
								<div
									class="absolute bg-yellow-500/10 border-yellow-500 border rounded"
									style={{
										transform: `translate(${dragArea().x}px, ${
											dragArea().y
										}px)`,
										width: `${dragArea().width}px`,
										height: `${dragArea().height}px`,
									}}
								/>
							)}
						</Solid.Show>
						{remoteSelectionBoxList()
							.filter(
								(b) =>
									b.graphKind === model().kind &&
									b.graphId === model().id &&
									b.width > 0 &&
									b.height > 0,
							)
							.map((box) => (
								<div
									class="absolute pointer-events-none z-40 bg-blue-500/10 border-blue-400 border border-dashed rounded"
									style={{
										transform: `translate(${box.x}px, ${box.y}px)`,
										width: `${box.width}px`,
										height: `${box.height}px`,
									}}
								/>
							))}
						{cursorList()
							.filter(
								(c) =>
									c.graphKind === model().kind &&
									c.graphId === model().id &&
									c.position.x > -9999,
							)
							.map((cursor) => (
								<div
									class="absolute pointer-events-none z-50"
									style={{
										transform: `translate(${cursor.position.x}px, ${cursor.position.y}px)`,
									}}
								>
									<div class="flex flex-col items-start">
										<svg width="18" height="22" viewBox="0 0 18 22" class="drop-shadow-lg">
											<polygon points="2,2 4,19 7,14 12,17 14,15 10,11 16,8" fill="#3b82f6" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
										</svg>
										<span class="text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded -mt-1 ml-4 font-medium whitespace-nowrap shadow">
											{cursor.id === "host" ? "Host" : cursor.id.slice(0, 6)}
										</span>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>
		</GraphContextProvider>
	);
};
