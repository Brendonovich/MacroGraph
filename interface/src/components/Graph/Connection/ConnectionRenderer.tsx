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
import { createEffect, createSignal, onCleanup, untrack } from "solid-js";

import { config } from "../../../ConfigDialog";
import type { GraphBounds } from "../../../context";
import { useInterfaceContext } from "../../../context";
import { trackConnectionDraw } from "../../../graphPerf";
import { getRemotePinDrags } from "../../../remoteHistorySync";
import { isPaneResizing, onPaneResizeEnd } from "../../../paneResizeSession";
import { useGraphContext } from "../Context";
import { colour } from "../util";

const LOAD_SETTLE_MS = 80;

export const ConnectionRenderer = (props: {
	graphBounds: GraphBounds;
	active?: boolean;
	onLoadComplete?: () => void;
}) => {
	const interfaceCtx = useInterfaceContext();
	const ctx = useGraphContext();
	const active = () => props.active !== false;

	const mousePosition = createMousePosition();

	let canvasRef: HTMLCanvasElement;
	let drawRaf: number | null = null;
	let loadComplete = false;
	let loadSettleTimer: ReturnType<typeof setTimeout> | undefined;

	const [paintEpoch, setPaintEpoch] = createSignal(0);
	onPaneResizeEnd(() => setPaintEpoch((n) => n + 1));

	function scheduleLoadComplete() {
		if (loadComplete || !props.onLoadComplete) return;
		clearTimeout(loadSettleTimer);
		loadSettleTimer = setTimeout(() => {
			if (loadComplete) return;
			loadComplete = true;
			props.onLoadComplete?.();
		}, LOAD_SETTLE_MS);
	}

	onCleanup(() => {
		if (drawRaf !== null) cancelAnimationFrame(drawRaf);
		clearTimeout(loadSettleTimer);
	});

	createEffect(() => {
		paintEpoch();
		interfaceCtx.pinPositionsEpoch();
		interfaceCtx.viewTransformEpoch();
		active();
		ctx.model();
		ctx.state.selectedItemIds;
		props.graphBounds.width;
		props.graphBounds.height;

		const st = interfaceCtx.state;
		st.status;
		if (st.status === "pinDragMode" || st.status === "connectionAssignMode") {
			st.pin;
			if (st.state.status === "schemaMenuOpen") {
				st.state.position.x;
				st.state.position.y;
			} else {
				mousePosition.x;
				mousePosition.y;
			}
			if (st.status === "pinDragMode" && st.state.status === "draggingPin") {
				st.state.autoconnectIO;
			}
		}

		if (!active() || isPaneResizing()) return;
		if (drawRaf !== null) return;

		drawRaf = requestAnimationFrame(() => {
			drawRaf = null;

			const canvas = canvasRef?.getContext("2d");
			if (!canvas) return;

			const drawStart = performance.now();

			untrack(() => {
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

				canvas.clearRect(
					0,
					0,
					props.graphBounds.width,
					props.graphBounds.height,
				);
				canvas.globalAlpha = 0.75;

				const graph = ctx.model();
				let connectionCount = 0;

				for (const [refStr, conns] of graph.connections) {
					const outRef = splitIORef(refStr);
					if (outRef.type === "i") continue;

					const output = graph.nodes.get(outRef.nodeId)?.output(outRef.ioId);
					if (!output) continue;

					for (const conn of conns) {
						connectionCount++;
						const inRef = splitIORef(conn);

						const isNodeSelected = ctx.state.selectedItemIds.find(
							(item) =>
								item.type === "node" &&
								(item.id === outRef.nodeId || item.id === inRef.nodeId),
						);

						const input = graph.nodes.get(inRef.nodeId)?.input(inRef.ioId);

						if (!input || !output) continue;

						const inputPosition = Maybe(
							interfaceCtx.pinPositions.get(input),
						);
						const outputPosition = Maybe(
							interfaceCtx.pinPositions.get(output),
						);

						inputPosition
							.zip(outputPosition)
							.map(([input, output]) => ({ input, output }))
							.peek((data) => {
								drawConnection(
									canvas,
									input instanceof DataInput ? input.type : null,
									data.output,
									data.input,
									ctx.state.selectedItemIds.length > 0
										? isNodeSelected ||
											!config.nodes.dimUnselectedConnections
											? 0.75
											: 0.15
										: 0.75,
								);
							});
					}
				}

				const dragState = (() => {
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
				})();

				if (dragState) {
					const pinGraph = dragState.pin.node.graph;
					if (pinGraph.kind === graph.kind && pinGraph.id === graph.id) {
						const pinPos = Maybe(
							interfaceCtx.pinPositions.get(dragState.pin),
						).map((pos) => ({
							x: pos.x,
							y: pos.y,
						}));

						const mousePos = ctx.toGraphSpace({
							x: dragState.mousePosition.x,
							y: dragState.mousePosition.y,
						});

						let autoconnectSnapped = false;

						if (
							interfaceCtx.state.status === "pinDragMode" &&
							interfaceCtx.state.state.status === "draggingPin" &&
							interfaceCtx.state.state.autoconnectIO
						) {
							const autoconnectIORef =
								interfaceCtx.state.state.autoconnectIO;

							const autoconnectIO = graph
								.pinFromRef(autoconnectIORef)
								.toNullable();
							if (autoconnectIO) {
								const autoconnectIOPosition = Maybe(
									interfaceCtx.pinPositions.get(autoconnectIO),
								).map((pos) => ({ x: pos.x, y: pos.y }));

								pinPos
									.zip(autoconnectIOPosition)
									.peek(([pinPos, autoconnectIOPosition]) => {
										autoconnectSnapped = true;
										if (AUTOCOMPLETE_MODE === "snap") {
											if (pinIsOutput(autoconnectIO)) {
												drawConnection(
													canvas,
													dragState.pin instanceof DataInput
														? dragState.pin.type
														: null,
													autoconnectIOPosition,
													pinPos,
												);
											} else {
												drawConnection(
													canvas,
													dragState.pin instanceof DataOutput
														? dragState.pin.type
														: null,
													pinPos,
													autoconnectIOPosition,
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
													mousePos,
													0.5,
												);
											} else {
												drawConnection(
													canvas,
													dragState.pin instanceof DataOutput
														? dragState.pin.type
														: null,
													mousePos,
													autoconnectIOPosition,
													0.5,
												);
											}
										}
									});
							}
						}

						if (!autoconnectSnapped)
							pinPos.peek((pinPos) => {
								if (pinIsOutput(dragState.pin))
									drawConnection(
										canvas,
										dragState.pin instanceof DataOutput
											? dragState.pin.type
											: null,
										pinPos,
										mousePos,
									);
								else
									drawConnection(
										canvas,
										dragState.pin instanceof DataInput
											? dragState.pin.type
											: null,
										mousePos,
										pinPos,
									);
							});
					}
				}

				for (const drag of getRemotePinDrags()) {
					if (drag.graphKind !== graph.kind || drag.graphId !== graph.id)
						continue;
					const node = graph.nodes.get(drag.pinNodeId);
					if (!node) continue;
					const pin = drag.isOutput
						? node.output(drag.pinId)
						: node.input(drag.pinId);
					if (!pin) continue;
					const pinPos = Maybe(interfaceCtx.pinPositions.get(pin)).map(
						(pos) => ({ x: pos.x, y: pos.y }),
					);
					pinPos.peek((pos) => {
						if (drag.isOutput)
							drawConnection(canvas, null, pos, drag.position, 0.35);
						else drawConnection(canvas, null, drag.position, pos, 0.35);
					});
				}

				trackConnectionDraw(
					performance.now() - drawStart,
					connectionCount,
				);
				scheduleLoadComplete();
			});
		});
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
