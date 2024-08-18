import { Maybe } from "@macrograph/option";
import {
	DataInput,
	DataOutput,
	type XY,
	pinIsOutput,
	splitIORef,
} from "@macrograph/runtime";
import type { t } from "@macrograph/typesystem";
import { createMousePosition } from "@solid-primitives/mouse";
import { createEffect } from "solid-js";

import type { GraphBounds } from "../../..";
import { useInterfaceContext } from "../../../context";
import { useGraphContext } from "../Context";
import { colour } from "../util";

export const ConnectionRenderer = (props: { graphBounds: GraphBounds }) => {
	const interfaceCtx = useInterfaceContext();
	const ctx = useGraphContext();

	const mousePosition = createMousePosition();

	const getDragState = () => {
		const { state } = interfaceCtx;

		if (
			state.status === "pinDragMode" ||
			state.status === "connectionAssignMode"
		) {
			if (state.state.status !== "schemaMenuOpen")
				return { pin: state.pin, mousePosition };

			return { pin: state.pin, mousePosition: state.state.position };
		}

		return null;
	};

	let canvasRef: HTMLCanvasElement;

	createEffect(() => {
		const canvas = canvasRef.getContext("2d");
		if (!canvas) return;

		function fromGraphSpace(pos: XY) {
			return {
				x: (pos.x - ctx.state.translate.x) * ctx.state.scale,
				y: (pos.y - ctx.state.translate.y) * ctx.state.scale,
			};
		}

		function drawConnection(
			canvas: CanvasRenderingContext2D,
			type: t.Any | null,
			_from: XY,
			_to: XY,
			alpha = 0.75,
		) {
			const from = fromGraphSpace(_from);
			const to = fromGraphSpace(_to);

			const xDiff = from.x - to.x;
			const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

			canvas.lineWidth = 3 * ctx.state.scale;
			canvas.beginPath();
			canvas.moveTo(from.x, from.y);
			canvas.bezierCurveTo(
				from.x + cpMagnitude,
				from.y,
				to.x - cpMagnitude,
				to.y,
				to.x,
				to.y,
			);
			canvas.strokeStyle = type ? colour(type) : "white";
			canvas.globalAlpha = alpha;
			canvas.stroke();
		}

		canvas.clearRect(0, 0, props.graphBounds.width, props.graphBounds.height);
		canvas.globalAlpha = 0.75;

		const graph = ctx.model();

		for (const [refStr, conns] of graph.connections) {
			const outRef = splitIORef(refStr);
			if (outRef.type === "i") continue;

			const output = graph.nodes.get(outRef.nodeId)?.output(outRef.ioId);
			if (!output) continue;

			for (const conn of conns) {
				const inRef = splitIORef(conn);

				const isNodeSelected = ctx.state.selectedItemIds.find(
					(item) =>
						item.type === "node" &&
						(item.id === outRef.nodeId || item.id === inRef.nodeId),
				);

				const input = graph.nodes.get(inRef.nodeId)?.input(inRef.ioId);

				if (!input || !output) continue;

				const inputPosition = Maybe(interfaceCtx.pinPositions.get(input));
				const outputPosition = Maybe(interfaceCtx.pinPositions.get(output));

				inputPosition
					.zip(outputPosition)
					.map(([input, output]) => ({ input, output }))
					.peek((data) => {
						drawConnection(
							canvas,
							input instanceof DataInput ? input.type : null, // colour(input.type) : "white",
							data.output,
							data.input,
							ctx.state.selectedItemIds.length > 0
								? isNodeSelected
									? 0.75
									: 0.25
								: 0.75,
						);
					});
			}
		}

		const dragState = getDragState();
		if (dragState) {
			const pinPos = Maybe(interfaceCtx.pinPositions.get(dragState.pin)).map(
				(pos) => ({
					x: pos.x,
					y: pos.y,
				}),
			);

			const mousePosition = ctx.toGraphSpace({
				x: dragState.mousePosition.x,
				y: dragState.mousePosition.y,
			});

			pinPos.peek((pinPos) => {
				if (pinIsOutput(dragState.pin))
					drawConnection(
						canvas,
						dragState.pin instanceof DataOutput ? dragState.pin.type : null,
						pinPos,
						mousePosition,
					);
				else
					drawConnection(
						canvas,
						dragState.pin instanceof DataInput ? dragState.pin.type : null,
						mousePosition,
						pinPos,
					);
			});

			if (
				interfaceCtx.state.status === "pinDragMode" &&
				interfaceCtx.state.state.status === "draggingPin" &&
				interfaceCtx.state.state.autoconnectIO
			) {
				const autoconnectIORef = interfaceCtx.state.state.autoconnectIO;

				const autoconnectIO = graph.pinFromRef(autoconnectIORef).toNullable();
				if (autoconnectIO) {
					const autoconnectIOPosition = Maybe(
						interfaceCtx.pinPositions.get(autoconnectIO),
					).map((pos) => ({ x: pos.x, y: pos.y }));

					pinPos
						.zip(autoconnectIOPosition)
						.peek(([pinPos, autoconnectIOPosition]) => {
							if (AUTOCOMPLETE_MODE === "snap") {
								if (pinIsOutput(autoconnectIO)) {
									drawConnection(
										canvas,
										dragState.pin instanceof DataInput
											? dragState.pin.type
											: null,
										autoconnectIOPosition,
										pinPos,
										0.5,
									);
								} else {
									drawConnection(
										canvas,
										dragState.pin instanceof DataOutput
											? dragState.pin.type
											: null,
										pinPos,
										autoconnectIOPosition,
										0.5,
									);
								}
							} else {
								if (pinIsOutput(autoconnectIO)) {
									drawConnection(
										canvas,
										dragState.pin instanceof DataInput
											? dragState.pin.type
											: null,
										autoconnectIOPosition,
										mousePosition,
										0.5,
									);
								} else {
									drawConnection(
										canvas,
										dragState.pin instanceof DataOutput
											? dragState.pin.type
											: null,
										mousePosition,
										autoconnectIOPosition,
										0.5,
									);
								}
							}
						});
				}
			}
		}
	});

	return (
		<canvas
			ref={canvasRef!}
			class="absolute inset-0"
			width={props.graphBounds.width}
			height={props.graphBounds.height}
		/>
	);
};

const AUTOCOMPLETE_MODE: "snap" | "smooth" = "snap";
