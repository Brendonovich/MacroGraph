import { Maybe } from "@macrograph/option";
import { DataInput, DataOutput, type XY, pinIsOutput } from "@macrograph/runtime";
import type { t } from "@macrograph/typesystem";
import { createMousePosition } from "@solid-primitives/mouse";
import { createEffect, createSignal, onCleanup, untrack } from "solid-js";

import { config } from "../../../ConfigDialog";
import type { GraphBounds } from "../../../context";
import { useInterfaceContext } from "../../../context";
import { getRemotePinDrags } from "../../../remoteHistorySync";
import { isPaneResizing, onPaneResizeEnd } from "../../../paneResizeSession";
import { useGraphContext } from "../Context";
import { colour } from "../util";
import { markGraphLoadDetail, markGraphLoadPhase } from "../../../graphLoadPerf";
import { connectionCacheKey, getCompiledEdges } from "../compiledEdges";

const LOAD_SETTLE_MS = 80;

let lastGraphKey = "";

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
		ctx.model().kind;
		ctx.model().id;
		connectionCacheKey(ctx.model());
		ctx.selectedItemIds();
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
				type PathBatch = {
					colour: string;
					alpha: number;
					path: Path2D;
				};
				const pathBatches = new Map<string, PathBatch>();
				let pathSegmentCount = 0;

				function drawConnection(
					type: t.Any | null,
					_from: XY,
					_to: XY,
					alpha = 0.75,
				) {
					const fromX = (_from.x - screenTx) * screenScale;
					const fromY = (_from.y - screenTy) * screenScale;
					const toX = (_to.x - screenTx) * screenScale;
					const toY = (_to.y - screenTy) * screenScale;
					const xDiff = fromX - toX;
					const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));
					const c = type ? colour(type) : "white";
					const key = alpha < 0.5 ? `${c}|d` : `${c}|n`;
					let batch = pathBatches.get(key);
					if (!batch) {
						batch = { colour: c, alpha, path: new Path2D() };
						pathBatches.set(key, batch);
					}
					batch.path.moveTo(fromX, fromY);
					batch.path.bezierCurveTo(
						fromX + cpMagnitude,
						fromY,
						toX - cpMagnitude,
						toY,
						toX,
						toY,
					);
					pathSegmentCount++;
				}

				function flushConnectionBatches() {
					canvas.lineWidth = 3 * ctx.state.scale;
					for (const batch of pathBatches.values()) {
						canvas.strokeStyle = batch.colour;
						canvas.globalAlpha = batch.alpha;
						canvas.stroke(batch.path);
					}
				}

				canvas.clearRect(
					0,
					0,
					props.graphBounds.width,
					props.graphBounds.height,
				);
				canvas.globalAlpha = 0.75;

				const graph = ctx.model();
				const graphKey = `${graph.kind}:${graph.id}`;
				if (graphKey !== lastGraphKey) {
					lastGraphKey = graphKey;
					loadComplete = false;
				}

				let connectionCount = 0;
				let totalConnectionCandidates = 0;
				const selectedItems = ctx.selectedItemIds();
				const selectedIds =
					selectedItems.length > 0
						? new Set(
								selectedItems
									.filter((item) => item.type === "node")
									.map((item) => item.id),
							)
						: null;
				const useSelectionDimming =
					selectedIds !== null && config.nodes.dimUnselectedConnections;
				const hasSelection = selectedIds !== null;

				const padG = 280;
				const tx = ctx.state.translate.x;
				const ty = ctx.state.translate.y;
				const s = ctx.state.scale;
				const vw = props.graphBounds.width;
				const vh = props.graphBounds.height;
				const visL = tx - padG;
				const visT = ty - padG;
				const visR = tx + vw / s + padG;
				const visB = ty + vh / s + padG;
				const screenScale = s;
				const screenTx = tx;
				const screenTy = ty;
				const segMayBeVisible = (a: XY, b: XY) => {
					const minX = Math.min(a.x, b.x);
					const maxX = Math.max(a.x, b.x);
					const minY = Math.min(a.y, b.y);
					const maxY = Math.max(a.y, b.y);
					return !(maxX < visL || minX > visR || maxY < visT || minY > visB);
				};

				const draggingPin =
					interfaceCtx.state.status === "pinDragMode" ||
					interfaceCtx.state.status === "connectionAssignMode"
						? interfaceCtx.state.pin
						: null;

				for (const edge of getCompiledEdges(graph)) {
					if (
						draggingPin &&
						(edge.output === draggingPin || edge.input === draggingPin)
					)
						continue;
					const outputPos = interfaceCtx.pinPositions.get(edge.output as any);
					if (!outputPos) continue;
					const inputPos = interfaceCtx.pinPositions.get(edge.input as any);
					if (!inputPos) continue;
					totalConnectionCandidates++;
					if (!segMayBeVisible(outputPos, inputPos)) continue;
					connectionCount++;
					let alpha = 0.75;
					if (
						hasSelection &&
						useSelectionDimming &&
						!selectedIds!.has(edge.outNodeId) &&
						!selectedIds!.has(edge.inNodeId)
					)
						alpha = 0.15;
					drawConnection(edge.inputType, outputPos, inputPos, alpha);
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
													dragState.pin instanceof DataInput
														? dragState.pin.type
														: null,
													autoconnectIOPosition,
													pinPos,
												);
											} else {
												drawConnection(
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
													dragState.pin instanceof DataInput
														? dragState.pin.type
														: null,
													autoconnectIOPosition,
													mousePos,
													0.5,
												);
											} else {
												drawConnection(
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
										dragState.pin instanceof DataOutput
											? dragState.pin.type
											: null,
										pinPos,
										mousePos,
									);
								else
									drawConnection(
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
							drawConnection(null, pos, drag.position, 0.35);
						else drawConnection(null, drag.position, pos, 0.35);
					});
				}

				flushConnectionBatches();

				markGraphLoadDetail(
					"connectionDrawMs",
					Math.round(performance.now() - drawStart),
					{ kind: graph.kind, id: graph.id },
				);
				markGraphLoadDetail("connectionsDrawnCount", connectionCount, {
					kind: graph.kind,
					id: graph.id,
				});
				markGraphLoadDetail(
					"connectionCandidates",
					totalConnectionCandidates,
					{ kind: graph.kind, id: graph.id },
				);
				markGraphLoadPhase("connectionsDrawn", {
					kind: graph.kind,
					id: graph.id,
				});

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
