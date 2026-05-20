import type { Graph, Node, Pin } from "@macrograph/runtime";
import { hasConnection } from "@macrograph/runtime";

import type { InterfaceContext } from "./context";

const NODE_HEADER = 24;
const NODE_PAD = 8;
const ROW_HEIGHT = 20;
const ROW_GAP = 10;
const PIN_X_INSET = 18;
const NODE_WIDTH = 220;

export function isFastLoadEnabled() {
	return (
		typeof globalThis !== "undefined" &&
		(globalThis as { __GRAPH_FAST_LOAD__?: boolean }).__GRAPH_FAST_LOAD__ ===
			true
	);
}

function visiblePins(node: Node) {
	const foldPins = node.state.foldPins;
	return {
		inputs: node.state.inputs.filter((i) => !foldPins || hasConnection(i)),
		outputs: node.state.outputs.filter((o) => !foldPins || hasConnection(o)),
	};
}

export function estimateNodeBodyHeight(node: Node) {
	const { inputs, outputs } = visiblePins(node);
	const rows = Math.max(inputs.length, outputs.length, 1);
	return NODE_PAD * 2 + rows * ROW_HEIGHT + Math.max(0, rows - 1) * ROW_GAP;
}

export function seedEstimatedPinPositions(
	graph: Graph,
	pinPositions: InterfaceContext["pinPositions"],
) {
	for (const node of graph.nodes.values()) {
		const { inputs, outputs } = visiblePins(node);
		const { x, y } = node.state.position;

		for (let i = 0; i < inputs.length; i++) {
			const pin = inputs[i]!;
			pinPositions.set(pin as Pin, {
				x: x + PIN_X_INSET,
				y:
					y +
					NODE_HEADER +
					NODE_PAD +
					i * (ROW_HEIGHT + ROW_GAP) +
					ROW_HEIGHT / 2,
			});
		}

		for (let i = 0; i < outputs.length; i++) {
			const pin = outputs[i]!;
			pinPositions.set(pin as Pin, {
				x: x + NODE_WIDTH - PIN_X_INSET,
				y:
					y +
					NODE_HEADER +
					NODE_PAD +
					i * (ROW_HEIGHT + ROW_GAP) +
					ROW_HEIGHT / 2,
			});
		}
	}
}
