import {
	type Pin,
	pinIsInput,
	pinIsOutput,
	pinsCanConnect,
} from "@macrograph/runtime";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import {
	type Accessor,
	batch,
	createEffect,
	createMemo,
	createRoot,
	createSignal,
} from "solid-js";

import { useUIStore } from "../../../UIStore";
import { useInterfaceContext } from "../../../context";
import { useGraphContext } from "../Context";

export function usePin(pin: Accessor<Pin>) {
	const interfaceCtx = useInterfaceContext();
	const graph = useGraphContext();

	const [getRef, ref] = createSignal<HTMLDivElement | null>(null!);

	const UI = useUIStore();

	const schemaMenuPin = () =>
		interfaceCtx.state.status === "schemaMenuOpen"
			? interfaceCtx.state.suggestion?.pin
			: undefined;

	const mouseState = createMemo(() => ({
		hovering: UI.state.hoveringPin === pin(),
		dragging:
			interfaceCtx.state.status === "draggingPin" &&
			interfaceCtx.state.pin === pin(),
	}));

	let justMouseUpped = false;

	createEffect(() => {
		const thisPin = pin();

		const ref = getRef();
		if (!ref) return;

		createEventListenerMap(ref, {
			mouseover: () => {
				const draggingPin = schemaMenuPin();

				if (
					!draggingPin ||
					(pinIsOutput(draggingPin) &&
						pinIsInput(thisPin) &&
						pinsCanConnect(draggingPin, thisPin)) ||
					(pinIsOutput(thisPin) &&
						pinIsInput(draggingPin) &&
						pinsCanConnect(thisPin, draggingPin))
				)
					UI.setHoveringPin(thisPin);
			},
			mouseleave: () => {
				if (justMouseUpped) return;
				UI.setHoveringPin();
			},
			mouseup: () => {
				batch(() => {
					interfaceCtx.setState({ status: "idle" });

					// Necessary since safari fires 'mouseleave' just after mouseup. i hate this.
					justMouseUpped = true;
					setTimeout(() => {
						justMouseUpped = false;
					}, 1);

					UI.setHoveringPin(thisPin);

					const draggingPin = schemaMenuPin();

					if (!draggingPin || draggingPin === thisPin) return;

					if (pinIsOutput(thisPin) && pinIsInput(draggingPin))
						graph.model().connectPins(thisPin, draggingPin);
					else if (pinIsInput(thisPin) && pinIsOutput(draggingPin))
						graph.model().connectPins(draggingPin, thisPin);
				});
			},
			mousedown: () => {
				interfaceCtx.setState({ status: "mouseDownOnPin", pin: thisPin });

				createRoot((dispose) => {
					createEventListenerMap(window, {
						mouseup: () => dispose(),
						mousemove: (e) => {
							interfaceCtx.setState({
								status: "draggingPin",
								pin: thisPin,
								mousePosition: {
									x: e.clientX,
									y: e.clientY,
								},
							});
						},
					});
				});
			},
			dblclick: () => {
				graph.model().disconnectPin(thisPin);
			},
		});
	});

	createEffect(() => {
		pin().node.state.foldPins;
		graph.state.translate.x;
		graph.state.translate.y;
		graph.state.scale;

		pin().node.state.position.x;
		pin().node.state.position.y;

		const ref = getRef();
		if (!ref) return;

		const rect = ref.getBoundingClientRect();

		if (rect)
			graph.pinPositions.set(pin(), {
				x: rect.x + rect.width / 2,
				y: rect.y + rect.height / 2,
			});
	});

	return {
		ref,
		active: () =>
			mouseState().hovering ||
			mouseState().dragging ||
			schemaMenuPin() === pin(),
	};
}
