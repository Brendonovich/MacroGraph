import { Maybe } from "@macrograph/option";
import {
	DataInput,
	ExecInput,
	ExecOutput,
	ScopeInput,
	ScopeOutput,
	type XY,
	pinIsOutput,
	splitIORef,
} from "@macrograph/runtime";
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
			colour: string,
			_from: XY,
			_to: XY,
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
			canvas.strokeStyle = colour;
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

				const input = graph.nodes.get(inRef.nodeId)?.input(inRef.ioId);

				if (!input || !output) continue;

				const inputPosition = Maybe(ctx.pinPositions.get(input));
				const outputPosition = Maybe(ctx.pinPositions.get(output));

				inputPosition
					.zip(outputPosition)
					.map(([input, output]) => ({
						input,
						output,
					}))
					.peek((data) => {
						drawConnection(
							canvas,
							input instanceof DataInput ? colour(input.type) : "white",
							data.output,
							data.input,
						);
					});
			}
		}

		const dragState = getDragState();
		if (dragState) {
			const pinPos = Maybe(ctx.pinPositions.get(dragState.pin)).map((pos) => ({
				x: pos.x,
				y: pos.y,
			}));

			const diffs = ctx.toGraphSpace({
				x: dragState.mousePosition.x,
				y: dragState.mousePosition.y,
			});

			const colourClass = (() => {
				const draggingPin = dragState.pin;

				if (
					draggingPin instanceof ExecInput ||
					draggingPin instanceof ExecOutput ||
					draggingPin instanceof ScopeOutput ||
					draggingPin instanceof ScopeInput
				)
					return "white";

				return colour(draggingPin.type);
			})();

			pinPos.peek((pinPos) => {
				if (pinIsOutput(dragState.pin))
					drawConnection(canvas, colourClass, pinPos, diffs);
				else drawConnection(canvas, colourClass, diffs, pinPos);
			});
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
