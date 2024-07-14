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
import { createEffect } from "solid-js";

import type { GraphBounds } from "../../..";
import { useUIStore } from "../../../UIStore";
import { colour } from "../util";
import { useGraphContext } from "../Context";

export const ConnectionRender = (props: { graphBounds: GraphBounds }) => {
	const ctx = useGraphContext();

	const UI = useUIStore();

	const getDragState = () => {
		if (UI.state.mouseDragLocation && UI.state.draggingPin) {
			return {
				mouseDragLocation: UI.state.mouseDragLocation,
				draggingPin: UI.state.draggingPin,
			};
		}
		return null;
	};

	let canvasRef: HTMLCanvasElement;

	createEffect(() => {
		const canvas = canvasRef.getContext("2d");
		if (!canvas) return;

		function drawConnection(
			canvas: CanvasRenderingContext2D,
			colour: string,
			from: XY,
			to: XY,
			cp1: XY,
			cp2: XY,
		) {
			canvas.lineWidth = 3 * ctx.state.scale;
			canvas.beginPath();
			canvas.moveTo(from.x, from.y);
			canvas.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
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
						const xDiff = data.input.x - data.output.x;
						const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

						drawConnection(
							canvas,
							input instanceof DataInput ? colour(input.type) : "white",
							data.input,
							data.output,
							{
								x: data.input.x - cpMagnitude,
								y: data.input.y,
							},
							{
								x: data.output.x + cpMagnitude,
								y: data.output.y,
							},
						);
					});
			}
		}

		const dragState = getDragState();
		if (!dragState) return;
		const pinPos = ctx.pinPositions.get(dragState.draggingPin);

		const diffs = {
			x: dragState.mouseDragLocation.x - props.graphBounds.x,
			y: dragState.mouseDragLocation.y - props.graphBounds.y,
		};

		const colourClass = (() => {
			const draggingPin = dragState.draggingPin;

			if (
				draggingPin instanceof ExecInput ||
				draggingPin instanceof ExecOutput ||
				draggingPin instanceof ScopeOutput ||
				draggingPin instanceof ScopeInput
			)
				return "white";

			return colour(draggingPin.type);
		})();

		if (!pinPos) return;

		const xDiff = pinPos.x - diffs.x;
		const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

		drawConnection(
			canvas,
			colourClass,
			pinPos,
			diffs,
			{
				x:
					pinPos.x +
					cpMagnitude * (+pinIsOutput(dragState.draggingPin) * 2 - 1),
				y: pinPos.y,
			},
			{
				x:
					diffs.x - cpMagnitude * (+pinIsOutput(dragState.draggingPin) * 2 - 1),
				y: diffs.y,
			},
		);
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
