import {
	DataInput,
	DataOutput,
	type Node,
	type XY,
	pinIsOutput,
} from "@macrograph/runtime";
import { Maybe } from "@macrograph/option";
import { createMousePosition } from "@solid-primitives/mouse";
import { createEffect, createSignal, onCleanup, untrack } from "solid-js";

import type { GraphBounds } from "../../../context";
import { useInterfaceContext } from "../../../context";
import { getRemotePinDrags } from "../../../remoteHistorySync";
import { isPaneResizing, onPaneResizeEnd } from "../../../paneResizeSession";
import { markGraphLoadDetail, markGraphLoadPhase } from "../../../graphLoadPerf";
import { useGraphContext } from "../Context";
import { getCompiledEdges } from "./compiledEdges";
import { buildGraphFrame } from "./graphWebGLDraw";
import { WebGLGraphContext } from "./webglContext";

const LOAD_SETTLE_MS = 80;
const EST_VERTICES = 65536;

export const GraphWebGLRenderer = (props: {
	graphBounds: GraphBounds;
	active?: boolean;
	nodes: () => Node[];
	commentBoxes: () => Iterable<import("@macrograph/runtime").CommentBox>;
	dragArea: () => { x: number; y: number; width: number; height: number } | null;
	remoteSelectionBoxes?: () => Array<{
		x: number;
		y: number;
		width: number;
		height: number;
	}>;
	onLoadComplete?: () => void;
}) => {
	const interfaceCtx = useInterfaceContext();
	const ctx = useGraphContext();
	const active = () => props.active !== false;
	const mousePosition = createMousePosition();

	let canvasRef: HTMLCanvasElement;
	let glCtx: WebGLGraphContext | undefined;
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
		ctx.selectedItemIds();
		props.graphBounds.width;
		props.graphBounds.height;
		props.nodes();
		[...props.commentBoxes()];
		props.dragArea();

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
		}

		if (!active() || isPaneResizing()) return;
		if (drawRaf !== null) return;

		drawRaf = requestAnimationFrame(() => {
			drawRaf = null;
			const canvas = canvasRef;
			if (!canvas) return;

			try {
				if (!glCtx) glCtx = new WebGLGraphContext(canvas);
			} catch (err) {
				console.error("[GraphWebGLRenderer]", err);
				return;
			}

			const drawStart = performance.now();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const bw = Math.max(1, Math.floor(props.graphBounds.width * dpr));
			const bh = Math.max(1, Math.floor(props.graphBounds.height * dpr));
			if (canvas.width !== bw || canvas.height !== bh) {
				canvas.width = bw;
				canvas.height = bh;
			}

			untrack(() => {
				const graph = ctx.model();
				const translate = ctx.state.translate;
				const scale = ctx.state.scale;
				const view = {
					translate,
					scale,
					width: props.graphBounds.width,
					height: props.graphBounds.height,
				};

				const selectedItems = ctx.selectedItemIds();
				const selectedNodeIds =
					selectedItems.length > 0
						? new Set(
								selectedItems
									.filter((item) => item.type === "node")
									.map((item) => item.id),
							)
						: null;
				const selectedCommentIds =
					selectedItems.length > 0
						? new Set(
								selectedItems
									.filter((item) => item.type === "commentBox")
									.map((item) => item.id),
							)
						: null;

				let dragConnection: {
					from: XY;
					to: XY;
					type: import("@macrograph/typesystem").t.Any | null;
					alpha?: number;
				} | null = null;

				const { state } = interfaceCtx;
				if (
					state.status === "pinDragMode" ||
					state.status === "connectionAssignMode"
				) {
					const pinGraph = state.pin.node.graph;
					if (pinGraph.kind === graph.kind && pinGraph.id === graph.id) {
						const pinPos = Maybe(interfaceCtx.pinPositions.get(state.pin)).map(
							(pos) => ({ x: pos.x, y: pos.y }),
						);
						const mousePos = ctx.toGraphSpace({
							x:
								state.state.status === "schemaMenuOpen"
									? state.state.position.x
									: mousePosition.x,
							y:
								state.state.status === "schemaMenuOpen"
									? state.state.position.y
									: mousePosition.y,
						});

						pinPos.peek((from) => {
							if (pinIsOutput(state.pin))
								dragConnection = {
									type:
										state.pin instanceof DataOutput ? state.pin.type : null,
									from,
									to: mousePos,
								};
							else
								dragConnection = {
									type: state.pin instanceof DataInput ? state.pin.type : null,
									from: mousePos,
									to: from,
								};
						});
					}
				}

				const remotePinDrags: Array<{ from: XY; to: XY; alpha?: number }> = [];
				for (const drag of getRemotePinDrags()) {
					if (drag.graphKind !== graph.kind || drag.graphId !== graph.id) continue;
					const node = graph.nodes.get(drag.pinNodeId);
					if (!node) continue;
					const pin = drag.isOutput
						? node.output(drag.pinId)
						: node.input(drag.pinId);
					if (!pin) continue;
					const pinPos = Maybe(interfaceCtx.pinPositions.get(pin)).map((pos) => ({
						x: pos.x,
						y: pos.y,
					}));
					pinPos.peek((from) => {
						remotePinDrags.push(
							drag.isOutput
								? { from, to: drag.position, alpha: 0.35 }
								: { from: drag.position, to: from, alpha: 0.35 },
						);
					});
				}

				const data = glCtx!.resizeBuffer(EST_VERTICES);
				const vertexCount = buildGraphFrame(data, {
					view,
					translate,
					graph,
					nodes: props.nodes(),
					commentBoxes: [...props.commentBoxes()],
					itemSizes: interfaceCtx.itemSizes,
					pinPositions: interfaceCtx.pinPositions,
					selectedNodeIds,
					selectedCommentIds,
					edges: getCompiledEdges(graph),
					dragConnection,
					remotePinDrags,
					dragArea: props.dragArea(),
					remoteSelectionBoxes: props.remoteSelectionBoxes?.() ?? [],
				});

				glCtx!.begin(view, bw, bh);
				glCtx!.flush(vertexCount);

				markGraphLoadDetail(
					"connectionDrawMs",
					Math.round(performance.now() - drawStart),
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
			class="absolute inset-0 pointer-events-none"
			style={{
				width: `${props.graphBounds.width}px`,
				height: `${props.graphBounds.height}px`,
			}}
		/>
	);
};
