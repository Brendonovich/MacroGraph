import type { Graph, Node, Size } from "@macrograph/runtime";
import { produce } from "solid-js/store";

import type { MosaicWorkspaceState } from "./mosaicLayout";

/** Keep in sync with `components/Graph/Graph.tsx` zoom clamps. */
const GRAPH_MAX_ZOOM_IN = 1.6;
const GRAPH_MAX_ZOOM_OUT = 5;
const GRAPH_MIN_SCALE = 1 / GRAPH_MAX_ZOOM_OUT;

export type FrameGraphNodeEditor = {
	graphBounds: { width: number; height: number };
	itemSizes: { get(node: Node): Size | undefined };
	mosaicState: MosaicWorkspaceState;
	setMosaicState: (...args: any[]) => void;
};

/** Pan/zoom the active graph tab so `node` is centered in the viewport. */
export function frameNodeInActiveTab(
	editor: FrameGraphNodeEditor,
	graph: Graph,
	node: Node,
) {
	const maxAttempts = 16;

	const tryApply = (attempt: number) => {
		const { width: vw, height: vh } = editor.graphBounds;
		if (vw <= 0 || vh <= 0) {
			if (attempt < maxAttempts)
				requestAnimationFrame(() => tryApply(attempt + 1));
			return;
		}

		const measured = editor.itemSizes.get(node);
		const hasMeasured =
			measured !== undefined && measured.width > 0 && measured.height > 0;
		if (!hasMeasured && attempt < maxAttempts) {
			requestAnimationFrame(() => tryApply(attempt + 1));
			return;
		}

		const nw = hasMeasured ? measured!.width : 280;
		const nh = hasMeasured ? measured!.height : 120;

		const nx = node.state.position.x;
		const ny = node.state.position.y;
		const cx = nx + nw / 2;
		const cy = ny + nh / 2;

		const margin = 0.82;
		const scaleFit = Math.min((vw * margin) / nw, (vh * margin) / nh);
		const scale = Math.min(
			GRAPH_MAX_ZOOM_IN,
			Math.max(GRAPH_MIN_SCALE, scaleFit),
		);

		const groupIndex = editor.mosaicState.groups.findIndex(
			(g) => g.id === editor.mosaicState.focusedGroupId,
		);
		const tabIndex = editor.mosaicState.groups[groupIndex]?.tabs.findIndex(
			(t) =>
				(t.type === "graph" ||
					t.type === "function" ||
					t.type === "queue") &&
				t.graphKind === graph.kind &&
				t.graphId === graph.id,
		);
		if (tabIndex === undefined || tabIndex < 0) return;

		editor.setMosaicState(
			"groups",
			groupIndex,
			"tabs",
			tabIndex,
			produce((tab: any) => {
				tab.scale = scale;
				tab.translate = {
					x: cx - vw / (2 * scale),
					y: cy - vh / (2 * scale),
				};
			}),
		);
	};

	requestAnimationFrame(() => {
		requestAnimationFrame(() => tryApply(0));
	});
}
