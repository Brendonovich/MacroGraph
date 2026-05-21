import type { CommentBox, Graph, Node, XY } from "@macrograph/runtime";
import { DataInput } from "@macrograph/runtime";
import type { t } from "@macrograph/typesystem";

import { config } from "../../../ConfigDialog";
import type { InterfaceContext } from "../../../context";
import { dotGridParams } from "../DotGrid";
import { colour } from "../util";
import { GRID_SIZE } from "../util";
import { estimateNodeBodyHeight } from "../../../graphFastLoad";
import {
	type GraphViewUniforms,
	type Rgba,
	hexToRgba,
	pushRect,
	pushRectOutline,
	resetWriter,
	writerCount,
} from "./webglContext";
import { nodeVariantColour } from "./nodeVariant";

const NODE_HEADER = 24;
const NODE_BORDER = 2;
const BODY_RGBA: Rgba = [0, 0, 0, 0.75];
const BORDER_RGBA: Rgba = [0, 0, 0, 0.75];
const FOCUS_RGBA: Rgba = [234 / 255, 179 / 255, 8 / 255, 1];
const MIN_SCREEN_PITCH = 6;

const SPACING_STEPS = [1, 2, 4, 8] as const;

function lerpSpacingMult(scale: number) {
	const MIN_ZOOM_SCALE = 0.2;
	const MAX_ZOOM_SCALE = 1.6;
	const MIN_ZOOM_SPACING_MULT = 8;
	const MAX_ZOOM_SPACING_MULT = 1;
	const zoomT =
		(Math.log(Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale))) -
			Math.log(MIN_ZOOM_SCALE)) /
		(Math.log(MAX_ZOOM_SCALE) - Math.log(MIN_ZOOM_SCALE));
	const lerped =
		MIN_ZOOM_SPACING_MULT +
		(MAX_ZOOM_SPACING_MULT - MIN_ZOOM_SPACING_MULT) * zoomT;
	return SPACING_STEPS.reduce((best, step) =>
		Math.abs(step - lerped) < Math.abs(best - lerped) ? step : best,
	);
}

export function drawDotGrid(
	data: Float32Array,
	view: GraphViewUniforms,
	translate: XY,
) {
	const { dotPx } = dotGridParams(view.scale);
	const spacingMult = lerpSpacingMult(view.scale);
	const graphStep = GRID_SIZE * spacingMult;
	const pitch = graphStep * view.scale;
	if (pitch < MIN_SCREEN_PITCH) return;

	const graphRight = translate.x + view.width / view.scale;
	const graphBottom = translate.y + view.height / view.scale;
	const startX = Math.floor(translate.x / graphStep) * graphStep;
	const startY = Math.floor(translate.y / graphStep) * graphStep;
	const half = (dotPx - 1) / view.scale / 2;
	const dotColor: Rgba = [1, 1, 1, 0.07];

	for (let gx = startX; gx <= graphRight; gx += graphStep) {
		for (let gy = startY; gy <= graphBottom; gy += graphStep) {
			pushRect(data, gx - half, gy - half, (dotPx - 1) / view.scale, (dotPx - 1) / view.scale, dotColor);
		}
	}
}

function nodeSize(
	node: Node,
	itemSizes: InterfaceContext["itemSizes"],
): { width: number; height: number } {
	const measured = itemSizes.get(node);
	const width = measured?.width ?? 220;
	const body = measured?.height
		? Math.max(0, measured.height - NODE_HEADER)
		: estimateNodeBodyHeight(node);
	return { width, height: NODE_HEADER + body };
}

export function drawNode(
	data: Float32Array,
	node: Node,
	itemSizes: InterfaceContext["itemSizes"],
	selected: boolean,
) {
	const { x, y } = node.state.position;
	const { width, height } = nodeSize(node, itemSizes);
	pushRect(data, x, y, width, height, BODY_RGBA);
	pushRect(data, x, y, width, NODE_HEADER, nodeVariantColour(node));
	pushRectOutline(data, x, y, width, height, NODE_BORDER, BORDER_RGBA);
	if (selected) {
		pushRectOutline(data, x - 2, y - 2, width + 4, height + 4, 2, FOCUS_RGBA);
	}
}

export function drawCommentBox(
	data: Float32Array,
	box: CommentBox,
	selected: boolean,
) {
	const { x, y } = box.position;
	const { x: w, y: h } = box.size;
	const tint = box.tint.replace("#", "");
	const v = Number.parseInt(tint.length === 3 ? tint.replace(/./g, "$&$&") : tint, 16);
	const fill: Rgba = [
		((v >> 16) & 255) / 255,
		((v >> 8) & 255) / 255,
		(v & 255) / 255,
		0.3,
	];
	pushRect(data, x, y, w, h, fill);
	pushRectOutline(data, x, y, w, h, 1, BORDER_RGBA);
	if (selected) {
		pushRectOutline(data, x - 2, y - 2, w + 4, h + 4, 2, FOCUS_RGBA);
	}
}

function bezierPoints(from: XY, to: XY, segments: number): XY[] {
	const xDiff = from.x - to.x;
	const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));
	const pts: XY[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const u = 1 - t;
		const x =
			u * u * u * from.x +
			3 * u * u * t * (from.x + cpMagnitude) +
			3 * u * t * t * (to.x - cpMagnitude) +
			t * t * t * to.x;
		const y =
			u * u * u * from.y +
			3 * u * u * t * from.y +
			3 * u * t * t * to.y +
			t * t * t * to.y;
		pts.push({ x, y });
	}
	return pts;
}

function parseColour(css: string): Rgba {
	if (css.startsWith("#")) return hexToRgba(css, 0.75);
	return [1, 1, 1, 0.75];
}

export function drawConnection(
	data: Float32Array,
	type: t.Any | null,
	from: XY,
	to: XY,
	alpha: number,
	lineWidthGraph: number,
) {
	const c = parseColour(type ? colour(type) : "white");
	c[3] = alpha;
	const pts = bezierPoints(from, to, 24);
	const half = lineWidthGraph / 2;
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i]!;
		const b = pts[i + 1]!;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		const nx = (-dy / len) * half;
		const ny = (dx / len) * half;
		pushTri(data, a.x + nx, a.y + ny, a.x - nx, a.y - ny, b.x + nx, b.y + ny, c);
		pushTri(data, a.x - nx, a.y - ny, b.x - nx, b.y - ny, b.x + nx, b.y + ny, c);
	}
}

export type DrawGraphFrameArgs = {
	view: GraphViewUniforms;
	translate: XY;
	graph: Graph;
	nodes: Node[];
	commentBoxes: CommentBox[];
	itemSizes: InterfaceContext["itemSizes"];
	pinPositions: InterfaceContext["pinPositions"];
	selectedNodeIds: Set<number> | null;
	selectedCommentIds: Set<number> | null;
	edges: Array<{
		outNodeId: number;
		inNodeId: number;
		output: unknown;
		input: unknown;
		inputType: t.Any | null;
	}>;
	dragConnection?: { from: XY; to: XY; type: t.Any | null; alpha?: number } | null;
	remotePinDrags?: Array<{ from: XY; to: XY; alpha?: number }>;
	dragArea: { x: number; y: number; width: number; height: number } | null;
	remoteSelectionBoxes: Array<{ x: number; y: number; width: number; height: number }>;
};

export function buildGraphFrame(data: Float32Array, args: DrawGraphFrameArgs): number {
	resetWriter();
	const {
		view,
		translate,
		graph,
		nodes,
		commentBoxes,
		itemSizes,
		pinPositions,
		selectedNodeIds,
		selectedCommentIds,
		edges,
		dragConnection,
		remotePinDrags,
		dragArea,
		remoteSelectionBoxes,
	} = args;

	drawDotGrid(data, view, translate);

	const padG = 280;
	const visL = translate.x - padG;
	const visT = translate.y - padG;
	const visR = translate.x + view.width / view.scale + padG;
	const visB = translate.y + view.height / view.scale + padG;
	const nodeVisible = (x: number, y: number, w: number, h: number) =>
		x + w >= visL && x <= visR && y + h >= visT && y <= visB;

	for (const box of commentBoxes) {
		const { x, y } = box.position;
		const { x: w, y: h } = box.size;
		if (!nodeVisible(x, y, w, h)) continue;
		drawCommentBox(data, box, selectedCommentIds?.has(box.id) ?? false);
	}

	for (const node of nodes) {
		const { x, y } = node.state.position;
		const { width, height } = nodeSize(node, itemSizes);
		if (!nodeVisible(x, y, width, height)) continue;
		drawNode(data, node, itemSizes, selectedNodeIds?.has(node.id) ?? false);
	}

	const useSelectionDimming =
		selectedNodeIds !== null && config.nodes.dimUnselectedConnections;
	const lineW = 3;
	const segVisible = (a: XY, b: XY) => {
		const minX = Math.min(a.x, b.x);
		const maxX = Math.max(a.x, b.x);
		const minY = Math.min(a.y, b.y);
		const maxY = Math.max(a.y, b.y);
		return !(maxX < visL || minX > visR || maxY < visT || minY > visB);
	};

	for (const edge of edges) {
		const outputPos = pinPositions.get(edge.output as never);
		if (!outputPos) continue;
		const inputPos = pinPositions.get(edge.input as never);
		if (!inputPos) continue;
		if (!segVisible(outputPos, inputPos)) continue;
		let alpha = 0.75;
		if (
			useSelectionDimming &&
			selectedNodeIds &&
			!selectedNodeIds.has(edge.outNodeId) &&
			!selectedNodeIds.has(edge.inNodeId)
		)
			alpha = 0.15;
		drawConnection(data, edge.inputType, outputPos, inputPos, alpha, lineW);
	}

	if (dragConnection) {
		drawConnection(
			data,
			dragConnection.type,
			dragConnection.from,
			dragConnection.to,
			dragConnection.alpha ?? 0.75,
			lineW,
		);
	}

	for (const drag of remotePinDrags ?? []) {
		drawConnection(data, null, drag.from, drag.to, drag.alpha ?? 0.35, lineW);
	}

	if (dragArea) {
		pushRect(
			data,
			dragArea.x,
			dragArea.y,
			dragArea.width,
			dragArea.height,
			[234 / 255, 179 / 255, 8 / 255, 0.1],
		);
		pushRectOutline(
			data,
			dragArea.x,
			dragArea.y,
			dragArea.width,
			dragArea.height,
			1,
			[234 / 255, 179 / 255, 8 / 255, 1],
		);
	}

	for (const box of remoteSelectionBoxes) {
		pushRect(data, box.x, box.y, box.width, box.height, [59 / 255, 130 / 255, 246 / 255, 0.1]);
		pushRectOutline(data, box.x, box.y, box.width, box.height, 1, [96 / 255, 165 / 255, 250 / 255, 1]);
	}

	return writerCount();
}
