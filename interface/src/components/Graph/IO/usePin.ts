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
} from "solid-js";

import { type InterfaceContext, useInterfaceContext } from "../../../context";
import { useGraphContext } from "../Context";

export function usePin(pin: Accessor<Pin>) {
	const interfaceCtx = useInterfaceContext();
	const graph = useGraphContext();

	const [getRef, ref] = createSignal<HTMLDivElement | null>(null!);

	const mouseState = createMemo(() => ({
		hovering: interfaceCtx.hoveringPin() === pin(),
		dragging:
			interfaceCtx.state.status === "pinDragMode" &&
			interfaceCtx.state.pin === pin(),
	}));

	let justMouseUpped = false;

	createEffect(() => {
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
							graphId: graph.model().id,
							out: { nodeId: thisPin.node.id, pinId: thisPin.id },
							in: { nodeId: draggingPin.node.id, pinId: draggingPin.id },
						});
					else if (pinIsInput(thisPin) && pinIsOutput(draggingPin))
						interfaceCtx.execute("connectIO", {
							graphId: graph.model().id,
							out: { nodeId: draggingPin.node.id, pinId: draggingPin.id },
							in: { nodeId: thisPin.node.id, pinId: thisPin.id },
						});

					// interfaceCtx.setState({ status: "idle" });
				});
			},
			pointerdown: (e) => {
				e.stopPropagation();

				const mouseDown = interfaceCtx.state;

				if (mouseDown.status === "connectionAssignMode") {
					if (pinIsOutput(thisPin) && pinIsInput(mouseDown.pin))
						interfaceCtx.execute("connectIO", {
							graphId: graph.model().id,
							out: { nodeId: thisPin.node.id, pinId: thisPin.id },
							in: { nodeId: mouseDown.pin.node.id, pinId: mouseDown.pin.id },
						});
					else if (pinIsInput(thisPin) && pinIsOutput(mouseDown.pin))
						interfaceCtx.execute("connectIO", {
							graphId: graph.model().id,
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
						interfaceCtx.setState({
							status: "pinDragMode",
							pin: thisPin,
							state: { status: "awaitingDragConfirmation" },
						});

						// necessary for later pointer events to be handled with touch
						ref.releasePointerCapture(e.pointerId);

						createRoot((dispose) => {
							let hasLeft = false;

							createEventListenerMap(ref, {
								pointerenter: () => {
									hasLeft = false;
									interfaceCtx.setState({
										status: "pinDragMode",
										pin: thisPin,
										state: { status: "awaitingDragConfirmation" },
									});
								},
								pointerleave: () => {
									hasLeft = true;
									interfaceCtx.setState({
										status: "pinDragMode",
										pin: thisPin,
										state: { status: "draggingPin" },
									});
								},
								pointerup: () => {
									interfaceCtx.setState({ status: "idle" });
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
									//       graphId: graph.model().id,
									//       out: { nodeId: thisPin.node.id, pinId: thisPin.id },
									//       in: {
									//         nodeId: autoconnectIO.node.id,
									//         pinId: autoconnectIO.id,
									//       },
									//     });
									//   else if (pinIsInput(thisPin) && pinIsOutput(autoconnectIO))
									//     interfaceCtx.execute("connectIO", {
									//       graphId: graph.model().id,
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
									if (!hasLeft) return;

									const autoconnectIO = getNearCompatibleIO(
										graph.model(),
										interfaceCtx,
										pin(),
										graph.toGraphSpace({
											x: e.clientX,
											y: e.clientY,
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
								},
							});
						});
					}
				}
			},
			dblclick: () => {
				interfaceCtx.execute("disconnectIO", {
					graphId: graph.model().id,
					ioRef: makeIORef(thisPin),
				});
			},
		});
	});

	createEffect(() => {
		pin().node.state.foldPins;
		pin().node.state.position.x;
		pin().node.state.position.y;

		const ref = getRef();
		if (!ref) return;

		const rect = ref.getBoundingClientRect();
		if (!rect) return;

		interfaceCtx.pinPositions.set(
			pin(),
			graph.toGraphSpace({
				x: rect.x + rect.width / 2,
				y: rect.y + rect.height / 2,
			}),
		);
	});

	const dim = createMemo(() => {
		const p = pin();

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
