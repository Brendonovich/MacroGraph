import {
	type Graph as GraphModel,
	type Size,
	type XY,
	getCommentBoxesInRect,
	getNodesInRect,
} from "@macrograph/runtime";
import { createBodyCursor } from "@solid-primitives/cursor";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import * as Solid from "solid-js";
import { createStore } from "solid-js/store";

import clsx from "clsx";
import { type SchemaMenuOpenState, useInterfaceContext } from "../../context";
import { ConnectionRenderer } from "../Graph";
import { CommentBox } from "./CommentBox";
import {
	type GraphContext,
	GraphContextProvider,
	type GraphState,
	type SelectedItemID,
	toGraphSpace,
	toScreenSpace,
} from "./Context";
import { Node } from "./Node";

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
	onItemsSelected(id: Array<SelectedItemID>, ephemeral?: boolean): void;
}

type State = {
	size: Size;
	bounds: XY;
};

export const Graph = (props: Props) => {
	const [ref, setRef] = Solid.createSignal<HTMLDivElement | undefined>();
	const interfaceCtx = useInterfaceContext();

	const model = () => props.graph;

	const [state, setState] = createStore<State>({
		size: { width: 0, height: 0 },
		bounds: { x: 0, y: 0 },
	});

	createResizeObserver(ref, (bounds) => {
		const value = {
			width: bounds.width,
			height: bounds.height,
		};

		props.onSizeChange(value);
		setState("size", value);
	});

	function onResize() {
		const bounds = ref()!.getBoundingClientRect()!;

		const value = {
			x: bounds.left,
			y: bounds.top,
		};

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

	return (
		<GraphContextProvider value={ctx}>
			<div
				{...props}
				class={clsx(
					"flex-1 w-full relative overflow-hidden bg-mg-graph",
					props.class,
				)}
				ref={setRef}
				onMouseUp={(e) => {
					if (e.button === 2) {
						if (pan() === "active") return;

						const state: SchemaMenuOpenState = {
							status: "schemaMenuOpen",
							graph: props.state,
							position: {
								x: e.clientX,
								y: e.clientY,
							},
						};

						if (interfaceCtx.state.status === "connectionAssignMode")
							interfaceCtx.setState({
								...interfaceCtx.state,
								state,
							});
						else interfaceCtx.setState(state);
					} else if (
						e.button === 0 &&
						interfaceCtx.state.status === "pinDragMode"
					) {
						interfaceCtx.setState({
							...interfaceCtx.state,
							status: "pinDragMode",
							state: {
								status: "schemaMenuOpen",
								position: {
									x: e.clientX,
									y: e.clientY,
								},
								graph: props.state,
							},
						});
					}
				}}
				onMouseDown={(e) => {
					switch (e.button) {
						case 0: {
							const start = ctx.toGraphSpace({
								x: e.clientX,
								y: e.clientY,
							});
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
											...getNodesInRect(model().nodes.values(), rect, (node) =>
												interfaceCtx.nodeSizes.get(node),
											),
										].map((n) => ({ id: n.id, type: "node" as const })),
										...[
											...getCommentBoxesInRect(
												model().commentBoxes.values(),
												rect,
											),
										].map((b) => ({
											id: b.id,
											type: "commentBox" as const,
										})),
									];

									return [items, rect] as const;
								};

								createEventListenerMap(window, {
									mouseup: (e) => {
										dispose();

										const [items] = getItems(e);
										setDragArea(null);

										if (items.length === 0) {
											interfaceCtx.setState({ status: "idle" });
											if (props.state.selectedItemIds.length > 0)
												interfaceCtx.execute("setGraphSelection", {
													graphId: model().id,
													selection: [],
												});
										} else {
											props.onItemsSelected(items, false);
										}
									},
									mousemove: (e) => {
										const [items, rect] = getItems(e);
										setDragArea(rect);

										props.onItemsSelected(items, true);
									},
								});
							});
							break;
						}
						case 2: {
							setPan("waiting");

							const oldTranslate = { ...props.state.translate };
							const startPosition = {
								x: e.clientX,
								y: e.clientY,
							};

							Solid.createRoot((dispose) => {
								Solid.createEffect(() => {
									if (pan() === "active")
										interfaceCtx.setState({ status: "idle" });
								});

								createEventListenerMap(window, {
									mouseup: () => {
										dispose();
										setPan("none");
									},
									mousemove: (e) => {
										const MOVE_BUFFER = 3;

										if (
											Math.abs(startPosition.x - e.clientX) < MOVE_BUFFER &&
											Math.abs(startPosition.x - e.clientY) < MOVE_BUFFER
										)
											return;

										setPan("active");

										const { scale } = props.state;

										props.onTranslateChange({
											x:
												(startPosition.x - e.clientX + oldTranslate.x * scale) /
												scale,
											y:
												(startPosition.y - e.clientY + oldTranslate.y * scale) /
												scale,
										});
									},
								});
							});

							break;
						}
					}
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
										props.onItemsSelected(
											[{ type: "commentBox", id: box.id }],
											ephemeral,
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
										props.onItemsSelected(
											[{ type: "node", id: node.id }],
											ephemeral,
										)
									}
									onDrag={() => {}}
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
