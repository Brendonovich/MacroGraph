import {
	type Graph as GraphModel,
	type Size,
	type XY,
	getCommentBoxesInRect,
	getNodesInRect,
	pinIsInput,
	pinIsOutput,
} from "@macrograph/runtime";
import { createBodyCursor } from "@solid-primitives/cursor";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import { isMobile } from "@solid-primitives/platform";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import clsx from "clsx";
import * as Solid from "solid-js";
import { createStore } from "solid-js/store";

import { type SchemaMenuOpenState, useInterfaceContext } from "../../context";
import { ConnectionRenderer } from "../Graph";
import { CommentBox } from "./CommentBox";
import {
	type GraphContext,
	GraphContextProvider,
	type GraphState,
	toGraphSpace,
	toScreenSpace,
} from "./Context";
import { Node } from "./Node";
import { GRID_SIZE } from "./util";

type PanState = "none" | "waiting" | "active";

const MAX_ZOOM_IN = 2.5;
const MAX_ZOOM_OUT = 5;

interface Props extends Solid.ComponentProps<"div"> {
	state: GraphState;
	graph: GraphModel;
	onGraphDrag?(): void;
	onMouseDown?: Solid.JSX.EventHandler<HTMLDivElement, MouseEvent>;
	onMouseUp?: Solid.JSX.EventHandler<HTMLDivElement, MouseEvent>;
	onScaleChange(scale: number): void;
	onTranslateChange(translate: XY): void;
	onSizeChange(size: { width: number; height: number }): void;
	onBoundsChange(bounds: XY): void;
}

type State = { size: Size; bounds: XY };

export const Graph = (props: Props) => {
	const [ref, setRef] = Solid.createSignal<HTMLDivElement | undefined>();
	const interfaceCtx = useInterfaceContext();

	const model = () => props.graph;

	const [state, setState] = createStore<State>({
		size: { width: 0, height: 0 },
		bounds: { x: 0, y: 0 },
	});

	createResizeObserver(ref, (bounds) => {
		const value = { width: bounds.width, height: bounds.height };

		props.onSizeChange(value);
		setState("size", value);
	});

	function onResize() {
		const bounds = ref()!.getBoundingClientRect()!;

		const value = { x: bounds.left, y: bounds.top };

		props.onBoundsChange(value);
		setState("bounds", value);
	}

	function updateScale(delta: number, screenOrigin: XY) {
		const startGraphOrigin = toGraphSpace(
			screenOrigin,
			state.bounds,
			props.state,
		);

		props.onScaleChange(
			Math.min(
				Math.max(1 / MAX_ZOOM_OUT, props.state.scale + delta / 20),
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

	Solid.onMount(() => {
		createEventListener(window, "resize", onResize);
		createResizeObserver(ref, onResize);

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

	const [pan, setPan] = Solid.createSignal<PanState>("none");

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

				updateScale(delta, { x: e.clientX, y: e.clientY });
			} else
				props.onTranslateChange({
					x: props.state.translate.x + deltaX,
					y: props.state.translate.y + deltaY,
				});
		});

	createEventListener(window, "keydown", (e) => {
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
							graphId: model().id,
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
							graphId: model().id,
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
			return props.state;
		},
		offset: state.bounds,
		toGraphSpace: (xy) => toGraphSpace(xy, state.bounds, props.state),
		toScreenSpace: (xy) => toScreenSpace(xy, state.bounds, props.state),
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
			{ graphId: model().id, selection: [] },
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
				const end = ctx.toGraphSpace({ x: e.clientX, y: e.clientY });

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
					].map((b) => ({ id: b.id, type: "commentBox" as const })),
				];

				return [items, rect] as const;
			};

			let didMove = false;

			createEventListenerMap(window, {
				pointerup: (e) => {
					dispose();

					if (!didMove) {
						if (prevSelection.length !== 0)
							interfaceCtx.execute("setGraphSelection", {
								graphId: model().id,
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
									graphId: model().id,
									selection: [],
									prev: prevSelection,
								});
						} else {
							interfaceCtx.execute("setGraphSelection", {
								graphId: model().id,
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
						{ graphId: model().id, selection: items },
						{ ephemeral: true },
					);
				},
			});
		});
	}

	return (
		<GraphContextProvider value={ctx}>
			<div
				{...props}
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
							// graph: props.state,
							position: { x: e.clientX, y: e.clientY },
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
									graphId: model().id,
									out: { nodeId: thisPin.node.id, pinId: thisPin.id },
									in: {
										nodeId: autoconnectIO.node.id,
										pinId: autoconnectIO.id,
									},
								});
							else if (pinIsInput(thisPin) && pinIsOutput(autoconnectIO))
								interfaceCtx.execute("connectIO", {
									graphId: model().id,
									out: {
										nodeId: autoconnectIO.node.id,
										pinId: autoconnectIO.id,
									},
									in: { nodeId: thisPin.node.id, pinId: thisPin.id },
								});

							interfaceCtx.setState({ status: "idle" });
						} else {
							interfaceCtx.setState({
								...interfaceCtx.state,
								status: "pinDragMode",
								state: {
									status: "schemaMenuOpen",
									position: { x: e.clientX, y: e.clientY },
									// graph: props.state,
								},
							});
						}
					}
				}}
				onPointerDown={(e) => {
					setTimeout(() => {
						if (gesture.dragStarted) return;
						const { pointerId } = e;

						gesture.pointers.push({
							pointerId: e.pointerId,
							start: { x: e.clientX, y: e.clientY },
							current: { x: e.clientX, y: e.clientY },
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
						transform: `scale(${props.state.scale})`,
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
												graphId: model().id,
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
												graphId: model().id,
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
					</div>
				</div>
			</div>
		</GraphContextProvider>
	);
};
