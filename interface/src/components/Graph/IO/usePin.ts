import {
	DataOutput,
	ExecInput,
	type Pin,
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

import { useInterfaceContext } from "../../../context";
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
			mouseover: () => {
				if (interfaceCtx.state.status !== "pinDragMode")
					interfaceCtx.setHoveringPin(thisPin);
				else {
					const draggingPin = interfaceCtx.state.pin;
					if (
						(pinIsOutput(draggingPin) &&
							pinIsInput(thisPin) &&
							pinsCanConnect(draggingPin, thisPin)) ||
						(pinIsOutput(thisPin) &&
							pinIsInput(draggingPin) &&
							pinsCanConnect(thisPin, draggingPin))
					) {
						interfaceCtx.setHoveringPin(thisPin);
					}
				}
			},
			mouseleave: () => {
				if (justMouseUpped) return;

				interfaceCtx.setHoveringPin(null);
			},
			mouseup: () => {
				batch(() => {
					// Necessary since safari fires 'mouseleave' just after mouseup. i hate this.
					justMouseUpped = true;
					setTimeout(() => {
						justMouseUpped = false;
					}, 1);

					if (interfaceCtx.state.status !== "pinDragMode") return;
					const draggingPin = interfaceCtx.state.pin;

					interfaceCtx.setHoveringPin(thisPin);

					if (!draggingPin || draggingPin === thisPin) return;

					if (pinIsOutput(thisPin) && pinIsInput(draggingPin))
						graph.model().connectPins(thisPin, draggingPin);
					else if (pinIsInput(thisPin) && pinIsOutput(draggingPin))
						graph.model().connectPins(draggingPin, thisPin);

					interfaceCtx.setState({ status: "idle" });
				});
			},
			mousedown: (e) => {
				e.stopPropagation();

				const mouseDown = interfaceCtx.state;

				if (mouseDown.status === "connectionAssignMode") {
					if (pinIsOutput(thisPin) && pinIsInput(mouseDown.pin))
						graph.model().connectPins(thisPin, mouseDown.pin);
					else if (pinIsInput(thisPin) && pinIsOutput(mouseDown.pin))
						graph.model().connectPins(mouseDown.pin, thisPin);
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

						createRoot((dispose) => {
							let hasLeft = false;
							createEventListenerMap(ref, {
								mouseenter: () => {
									hasLeft = false;
									interfaceCtx.setState({
										status: "pinDragMode",
										pin: thisPin,
										state: { status: "awaitingDragConfirmation" },
									});
								},
								mouseleave: () => {
									hasLeft = true;
									interfaceCtx.setState({
										status: "pinDragMode",
										pin: thisPin,
										state: { status: "draggingPin" },
									});
								},
								mouseup: () => {
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
								},
								mouseup: () => dispose(),
								mousemove: () => {
									if (!hasLeft) return;
									interfaceCtx.setState({
										status: "pinDragMode",
										pin: thisPin,
										state: { status: "draggingPin" },
									});
								},
							});
						});
					}
				}
			},
			dblclick: () => {
				graph.model().disconnectPin(thisPin);
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

		graph.pinPositions.set(
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
		active: () =>
			mouseState().hovering ||
			mouseState().dragging ||
			(interfaceCtx.state.status === "connectionAssignMode" &&
				interfaceCtx.state.pin === pin()) ||
			(interfaceCtx.state.status === "pinDragMode" &&
				interfaceCtx.state.pin === pin()),
		dim,
	};
}
