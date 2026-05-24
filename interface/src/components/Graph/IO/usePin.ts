import {
	DataOutput,
	ExecInput,
	type Graph,
	type Pin,
	type XY,
	makeIORef,
	pinIsInput,
	pinIsOutput,
	pinsCanConnect,
	graphRefOf,
} from "@macrograph/runtime";
import {
	createEventListener,
	createEventListenerMap,
} from "@solid-primitives/event-listener";
import {
	type Accessor,
	batch,
	createEffect,
	createMemo,
	createRoot,
	createSignal,
	onCleanup,
	untrack,
} from "solid-js";

import { type InterfaceContext, useInterfaceContext } from "../../../context";
import { useGraphContext } from "../Context";

const pendingPinPositionMeasures = new Set<() => boolean>();
let pinPositionMeasureRaf: number | undefined;
let pinMeasureFlushBump: (() => void) | undefined;
const pinMeasureRectKey = new WeakMap<Pin, string>();
let pinMeasureGeneration = 0;

const PIN_MEASURE_BATCH = 500;

export function resetPinMeasureCache() {
	pinMeasureGeneration++;
}

function flushPinPositionMeasures() {
	const jobs = [...pendingPinPositionMeasures];
	pendingPinPositionMeasures.clear();
	let changed = false;
	const batch = jobs.slice(0, PIN_MEASURE_BATCH);
	for (const job of batch) changed = job() || changed;
	for (const job of jobs.slice(PIN_MEASURE_BATCH)) {
		pendingPinPositionMeasures.add(job);
	}
	if (pendingPinPositionMeasures.size > 0) {
		pinPositionMeasureRaf = requestAnimationFrame(() => {
			pinPositionMeasureRaf = undefined;
			flushPinPositionMeasures();
		});
	}
	if (changed) pinMeasureFlushBump?.();
}

function schedulePinPositionMeasure(run: () => boolean) {
	pendingPinPositionMeasures.add(run);
	if (pinPositionMeasureRaf !== undefined) return;
	pinPositionMeasureRaf = requestAnimationFrame(() => {
		pinPositionMeasureRaf = undefined;
		flushPinPositionMeasures();
	});
}

export function flushAllPinPositionMeasuresSync() {
	if (pinPositionMeasureRaf !== undefined) {
		cancelAnimationFrame(pinPositionMeasureRaf);
		pinPositionMeasureRaf = undefined;
	}
	const jobs = [...pendingPinPositionMeasures];
	pendingPinPositionMeasures.clear();
	let changed = false;
	for (const job of jobs) changed = job() || changed;
	if (changed) pinMeasureFlushBump?.();
}

export function usePin(pin: Accessor<Pin>) {
	const interfaceCtx = useInterfaceContext();
	const graph = useGraphContext();
	pinMeasureFlushBump = () => interfaceCtx.bumpPinPositionsEpoch();
	onCleanup(() => {
		if (pinMeasureFlushBump) pinMeasureFlushBump = undefined;
	});

	const [getRef, ref] = createSignal<HTMLDivElement | null>(null!);

	const mouseState = createMemo(() => ({
		hovering: interfaceCtx.hoveringPin() === pin(),
		dragging:
			interfaceCtx.state.status === "pinDragMode" &&
			interfaceCtx.state.pin === pin(),
	}));

	let justMouseUpped = false;

	createEffect(() => {
		if (!graph.pinsLayoutEnabled() || graph.shellMode()) return;
		const thisPin = pin();

		const ref = getRef();
		if (!ref) return;

		createEventListenerMap(ref, {
			pointerover: () => {
				if (interfaceCtx.state.status !== "pinDragMode") {
					interfaceCtx.setHoveringPin(thisPin);
				} else {
					const draggingPin = interfaceCtx.state.pin;
					if (
						(pinIsOutput(draggingPin) &&
							pinIsInput(thisPin) &&
							pinsCanConnect(draggingPin, thisPin)) ||
						(pinIsOutput(thisPin) &&
							pinIsInput(draggingPin) &&
							pinsCanConnect(thisPin, draggingPin))
					) {
						// interfaceCtx.setHoveringPin(thisPin);
					}
				}
			},
			pointerleave: () => {
				if (justMouseUpped) return;

				interfaceCtx.setHoveringPin(null);
			},
			pointerup: () => {
				if (interfaceCtx.hoveringPin() === thisPin) {
					interfaceCtx.setHoveringPin(null);
				}

				batch(() => {
					// Necessary since safari fires 'mouseleave' just after pointerup. i hate this.
					justMouseUpped = true;
					setTimeout(() => {
						justMouseUpped = false;
					}, 1);

					if (interfaceCtx.state.status !== "pinDragMode") return;
					const draggingPin = interfaceCtx.state.pin;

					if (!draggingPin || draggingPin === thisPin) return;

					if (pinIsOutput(thisPin) && pinIsInput(draggingPin))
						interfaceCtx.execute("connectIO", {
							...graphRefOf(graph.model()),
							out: { nodeId: thisPin.node.id, pinId: thisPin.id },
							in: { nodeId: draggingPin.node.id, pinId: draggingPin.id },
						});
					else if (pinIsInput(thisPin) && pinIsOutput(draggingPin))
						interfaceCtx.execute("connectIO", {
							...graphRefOf(graph.model()),
							out: { nodeId: draggingPin.node.id, pinId: draggingPin.id },
							in: { nodeId: thisPin.node.id, pinId: thisPin.id },
						});

					// interfaceCtx.setState({ status: "idle" });
				});
			},
			pointerdown: (e) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				if (e.detail > 1) return;

				const mouseDown = interfaceCtx.state;

				if (mouseDown.status === "connectionAssignMode") {
					if (pinIsOutput(thisPin) && pinIsInput(mouseDown.pin))
						interfaceCtx.execute("connectIO", {
							...graphRefOf(graph.model()),
							out: { nodeId: thisPin.node.id, pinId: thisPin.id },
							in: { nodeId: mouseDown.pin.node.id, pinId: mouseDown.pin.id },
						});
					else if (pinIsInput(thisPin) && pinIsOutput(mouseDown.pin))
						interfaceCtx.execute("connectIO", {
							...graphRefOf(graph.model()),
							out: { nodeId: mouseDown.pin.node.id, pinId: mouseDown.pin.id },
							in: { nodeId: thisPin.node.id, pinId: thisPin.id },
						});
				} else if (mouseDown.status === "idle") {
					if (
						(e.ctrlKey || e.metaKey) &&
						(thisPin instanceof DataOutput || thisPin instanceof ExecInput)
					) {
						interfaceCtx.setState({
							status: "connectionAssignMode",
							pin: thisPin,
							state: { status: "active" },
						});
						createRoot((dispose) => {
							createEffect(
								() => interfaceCtx.state.status === "idle" && dispose(),
							);
							createEventListener(window, "keydown", (e) => {
								if (e.key === "Escape")
									interfaceCtx.setState({ status: "idle" });
							});
						});
					} else {
						measurePinPosition(thisPin);

						interfaceCtx.setState({
							status: "pinDragMode",
							pin: thisPin,
							state: { status: "awaitingDragConfirmation" },
						});

						// necessary for later pointer events to be handled with touch
						ref.releasePointerCapture(e.pointerId);

						createRoot((dispose) => {
							const updateDragging = (moveEvent: PointerEvent) => {
								const autoconnectIO = getNearCompatibleIO(
									graph.model(),
									interfaceCtx,
									pin(),
									graph.toGraphSpace({
										x: moveEvent.clientX,
										y: moveEvent.clientY,
									}),
								);

								interfaceCtx.setState({
									status: "pinDragMode",
									pin: thisPin,
									state: {
										status: "draggingPin",
										autoconnectIO: autoconnectIO
											? makeIORef(autoconnectIO)
											: undefined,
									},
								});
							};

							createEventListenerMap(ref, {
								pointerleave: (e) => updateDragging(e),
								pointerup: () => {
									if (
										interfaceCtx.state.status === "pinDragMode" &&
										interfaceCtx.state.state.status ===
											"awaitingDragConfirmation"
									) {
										interfaceCtx.setState({ status: "idle" });
									}
								},
							});
							createEventListenerMap(window, {
								keydown: (e) => {
									if (e.code === "Escape") {
										e.preventDefault();
										e.stopPropagation();
										dispose();
										interfaceCtx.setState({ status: "idle" });
									}
									// replaced by https://github.com/Brendonovich/MacroGraph/issues/465
									// it's configurable
									// else if (e.code === "Tab") {
									//   e.preventDefault();
									//   e.stopPropagation();

									//   if (
									//     !(
									//       interfaceCtx.state.status === "pinDragMode" &&
									//       interfaceCtx.state.state.status === "draggingPin" &&
									//       interfaceCtx.state.state.autoconnectIO
									//     )
									//   )
									//     return;
									//   const autoconnectIORef =
									//     interfaceCtx.state.state.autoconnectIO;

									//   const autoconnectIO = graph
									//     .model()
									//     .pinFromRef(autoconnectIORef)
									//     .toNullable();
									//   if (!autoconnectIO) return;

									//   if (pinIsOutput(thisPin) && pinIsInput(autoconnectIO))
									//     interfaceCtx.execute("connectIO", {
									//       ...graphRefOf(graph.model()),
									//       out: { nodeId: thisPin.node.id, pinId: thisPin.id },
									//       in: {
									//         nodeId: autoconnectIO.node.id,
									//         pinId: autoconnectIO.id,
									//       },
									//     });
									//   else if (pinIsInput(thisPin) && pinIsOutput(autoconnectIO))
									//     interfaceCtx.execute("connectIO", {
									//       ...graphRefOf(graph.model()),
									//       out: {
									//         nodeId: autoconnectIO.node.id,
									//         pinId: autoconnectIO.id,
									//       },
									//       in: { nodeId: thisPin.node.id, pinId: thisPin.id },
									//     });

									//   interfaceCtx.setState({ status: "idle" });
									//   dispose();
									// }
								},
								pointerup: () => dispose(),
								pointermove: (e) => {
									if (
										interfaceCtx.state.status !== "pinDragMode" ||
										interfaceCtx.state.pin !== thisPin
									)
										return;

									const sub = interfaceCtx.state.state;
									if (
										sub.status !== "awaitingDragConfirmation" &&
										sub.status !== "draggingPin"
									)
										return;

									updateDragging(e);
								},
							});
						});
					}
				}
			},
			dblclick: (e) => {
				e.preventDefault();
				e.stopPropagation();
				interfaceCtx.setState({ status: "idle" });
				interfaceCtx.execute("disconnectIO", {
					...graphRefOf(graph.model()),
					ioRef: makeIORef(thisPin),
				});
			},
		});
	});

	const measurePinPosition = (p: Pin): boolean => {
		const el = getRef();
		if (!el || !el.isConnected) return false;

		const offset = graph.offset;
		if (!graph.viewportReady()) return false;

		const rect = el.getBoundingClientRect();
		if (!rect) return false;

		const rectKey = `${pinMeasureGeneration}|${offset.x}|${offset.y}|${rect.x}|${rect.y}|${rect.width}|${rect.height}`;
		if (pinMeasureRectKey.get(p) === rectKey) return false;
		pinMeasureRectKey.set(p, rectKey);

		interfaceCtx.pinPositions.set(
			p,
			untrack(() =>
				graph.toGraphSpace({
					x: rect.x + rect.width / 2,
					y: rect.y + rect.height / 2,
				}),
			),
		);
		return true;
	};

	createEffect(() => {
		if (!graph.pinsLayoutEnabled()) return;
		const p = pin();
		p.node.state.foldPins;
		p.node.state.position.x;
		p.node.state.position.y;
		graph.offset.x;
		graph.offset.y;
		graph.viewportReady();
		interfaceCtx.itemSizes.get(p.node);
		schedulePinPositionMeasure(() => measurePinPosition(p));
	});

	const dim = createMemo(() => {
		const p = pin();
		if (!graph.pinsLayoutEnabled() || graph.shellMode()) return false;

		if (
			(interfaceCtx.state.status !== "pinDragMode" ||
				interfaceCtx.state.state.status !== "draggingPin") &&
			interfaceCtx.state.status !== "connectionAssignMode"
		)
			return false;
		const draggingPin = interfaceCtx.state.pin;

		if (p === draggingPin) return false;

		if (pinIsInput(p) && pinIsOutput(draggingPin))
			return !pinsCanConnect(draggingPin, p);

		if (pinIsOutput(p) && pinIsInput(draggingPin))
			return !pinsCanConnect(p, draggingPin);

		return true;
	});

	return {
		ref,
		highlight: () =>
			mouseState().hovering ||
			mouseState().dragging ||
			(interfaceCtx.state.status === "connectionAssignMode" &&
				interfaceCtx.state.pin === pin()) ||
			(interfaceCtx.state.status === "pinDragMode" &&
				(interfaceCtx.state.pin === pin() ||
					(interfaceCtx.state.state.status === "draggingPin" &&
						interfaceCtx.state.state.autoconnectIO === makeIORef(pin())))),
		dim,
	};
}

function getNearCompatibleIO(
	graph: Graph,
	interfaceCtx: InterfaceContext,
	pin: Pin,
	mousePosition: XY,
): Pin | null {
	let nearest: [number, Pin] | null = null;

	for (const node of graph.nodes.values()) {
		if (pinIsInput(pin)) {
			for (const outputPin of node.state.outputs.values()) {
				if (pinsCanConnect(outputPin, pin)) {
					const outputPosition = interfaceCtx.pinPositions.get(outputPin);
					if (!outputPosition) continue;

					if (mousePosition.x < outputPosition.x - 10) continue;

					const distance = Math.hypot(
						outputPosition.x - mousePosition.x,
						outputPosition.y - mousePosition.y,
					);

					if (nearest) {
						if (distance < nearest[0]) nearest = [distance, outputPin];
					} else if (distance < AUTOCONNECT_MAX_DISTANCE)
						nearest = [distance, outputPin];
				}
			}
		} else {
			for (const inputPin of node.state.inputs.values()) {
				if (pinsCanConnect(pin, inputPin)) {
					const inputPosition = interfaceCtx.pinPositions.get(inputPin);
					if (!inputPosition) continue;

					if (mousePosition.x > inputPosition.x + 10) continue;

					const distance = Math.hypot(
						inputPosition.x - mousePosition.x,
						inputPosition.y - mousePosition.y,
					);

					if (nearest) {
						if (distance < nearest[0]) nearest = [distance, inputPin];
					} else if (distance < AUTOCONNECT_MAX_DISTANCE)
						nearest = [distance, inputPin];
				}
			}
		}
	}

	return nearest ? nearest[1] : null;
}

const AUTOCONNECT_MAX_DISTANCE = 30;
