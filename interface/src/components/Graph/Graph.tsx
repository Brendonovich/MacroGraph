import type {
	Graph as GraphModel,
	Node as NodeModel,
	Pin,
	Size,
	XY,
} from "@macrograph/runtime";
import { createBodyCursor } from "@solid-primitives/cursor";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import type { ReactiveWeakMap } from "@solid-primitives/map";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import * as Solid from "solid-js";
import { createStore } from "solid-js/store";

import { useInterfaceContext } from "../../context";
import { ConnectionRenderer } from "../Graph";
import { CommentBox } from "./CommentBox";
import {
	GraphContext,
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
	nodeSizes: WeakMap<NodeModel, Size>;
	pinPositions: ReactiveWeakMap<Pin, XY>;
	onGraphDrag?(): void;
	onMouseDown?: Solid.JSX.EventHandler<HTMLDivElement, MouseEvent>;
	onMouseUp?: Solid.JSX.EventHandler<HTMLDivElement, MouseEvent>;
	onScaleChange(scale: number): void;
	onTranslateChange(translate: XY): void;
	onSizeChange(size: { width: number; height: number }): void;
	onBoundsChange(bounds: XY): void;
	onItemSelected(id: SelectedItemID | null): void;
	schemaMenuDrag?: { pin: Pin; mousePos: XY };
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
					const { selectedItemId } = props.state;
					if (selectedItemId === null) return;
					if (selectedItemId.type !== "node") return;

					const node = model().nodes.get(selectedItemId.id);
					if (!node) return;

					node.state.foldPins = true;
					model().project.save();
				}

				return;
			}
			case "BracketRight": {
				const fold = (e.metaKey || e.shiftKey) && e.altKey;

				if (fold) {
					const { selectedItemId } = props.state;
					if (selectedItemId === null) return;
					if (selectedItemId.type !== "node") return;

					const node = model().nodes.get(selectedItemId.id);
					if (!node) return;

					node.state.foldPins = false;
					model().project.save();
				}

				return;
			}
			default:
				return;
		}
	});

	return (
		<GraphContext.Provider
			value={{
				model,
				pinPositions: props.pinPositions,
				get state() {
					return props.state;
				},
				get nodeSizes() {
					return props.nodeSizes;
				},
				schemaMenuDrag: () => props.schemaMenuDrag ?? null,
				offset: state.bounds,
				toGraphSpace: (xy) => toGraphSpace(xy, state.bounds, props.state),
				toScreenSpace: (xy) => toScreenSpace(xy, state.bounds, props.state),
			}}
		>
			<div
				{...props}
				class="flex-1 w-full relative overflow-hidden bg-mg-graph"
				ref={setRef}
				onMouseUp={(e) => {
					if (e.button === 2) {
						if (pan() === "active") return;

						interfaceCtx.setState({
							status: "schemaMenuOpen",
							graph: props.state,
							position: {
								x: e.clientX,
								y: e.clientY,
							},
						});
					} else if (
						e.button === 0 &&
						interfaceCtx.state.status === "draggingPin"
					) {
						const pin = interfaceCtx.state.pin;

						interfaceCtx.setState({
							status: "schemaMenuOpen",
							position: {
								x: e.clientX,
								y: e.clientY,
							},
							graph: props.state,
							suggestion: { pin },
						});
					}
				}}
				onMouseDown={(e) => {
					switch (e.button) {
						case 0: {
							props.onMouseDown?.(e);
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

					props.onMouseDown?.(e);
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
									onSelected={() =>
										props.onItemSelected({ type: "commentBox", id: box.id })
									}
								/>
							)}
						</Solid.For>
						<Solid.For each={[...model().nodes.values()]}>
							{(node) => (
								<Node
									node={node}
									onSelected={() =>
										props.onItemSelected({ type: "node", id: node.id })
									}
								/>
							)}
						</Solid.For>
					</div>
				</div>
			</div>
		</GraphContext.Provider>
	);
};
