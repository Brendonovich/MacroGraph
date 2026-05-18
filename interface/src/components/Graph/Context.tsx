import type {
	Graph as GraphModel,
	GraphKind,
	GraphRef,
	XY,
} from "@macrograph/runtime";
import { graphRefOf } from "@macrograph/runtime";
import { createContextProvider } from "@solid-primitives/context";
import type * as Solid from "solid-js";

export type SelectedItemID =
	| { type: "node"; id: number }
	| { type: "commentBox"; id: number };

export function toGraphSpace(clientXY: XY, bounds: XY, state: GraphViewState) {
	return {
		x: (clientXY.x - bounds.x) / state.scale + state.translate.x,
		y: (clientXY.y - bounds.y) / state.scale + state.translate.y,
	};
}

export function toScreenSpace(graphXY: XY, bounds: XY, state: GraphViewState) {
	return {
		x: (graphXY.x - state.translate.x) * state.scale + bounds.x,
		y: (graphXY.y - state.translate.y) * state.scale + bounds.y,
	};
}

export type GraphViewState = {
	graphKind: GraphKind;
	graphId: number;
	translate: XY;
	scale: number;
	selectedItemIds: SelectedItemID[];
};

export { graphRefOf };
export type { GraphRef };

export function graphRefFromTab(tab: GraphEditorTab): GraphRef {
	return {
		graphKind: tab.graphKind ?? tabGraphKind(tab),
		graphId: tab.graphId,
	};
}

export type GraphTab = GraphViewState & { type: "graph" };
export type FunctionTab = GraphViewState & { type: "function"; functionId: number };
export type QueueTab = GraphViewState & { type: "queue"; queueId: number };
export type FunctionQueueTab = {
	type: "functionQueue";
	functionQueueId: number;
};
export type SettingsTab = { type: "settings" };
export type PackageTab = { type: "package"; packageName: string };

export type TabState =
	| GraphTab
	| FunctionTab
	| QueueTab
	| FunctionQueueTab
	| SettingsTab
	| PackageTab;

export type GraphEditorTab = GraphTab | FunctionTab | QueueTab;

export function isGraphEditorTab(tab: TabState): tab is GraphEditorTab {
	return tab.type === "graph" || tab.type === "function" || tab.type === "queue";
}

export function tabGraphKind(tab: GraphEditorTab): GraphKind {
	if (tab.type === "function") return "function";
	if (tab.type === "queue") return "queue";
	return tab.graphKind ?? "graph";
}

export function coerceGraphScale(scale: unknown): number {
	if (typeof scale === "number" && Number.isFinite(scale) && scale > 0) {
		return scale;
	}
	if (typeof scale === "string") {
		const parsed = Number(scale);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return 1;
}

/** Ensures persisted / wire-restored mosaic tabs have required graph view fields. */
export function normalizeGraphEditorTab(tab: GraphEditorTab): GraphEditorTab {
	const translate = tab.translate ?? { x: 0, y: 0 };
	return {
		...tab,
		graphKind: tab.graphKind ?? tabGraphKind(tab),
		translate: { x: translate.x ?? 0, y: translate.y ?? 0 },
		scale: coerceGraphScale(tab.scale),
		selectedItemIds: Array.isArray(tab.selectedItemIds)
			? tab.selectedItemIds
			: [],
	};
}

export function makeGraphState(model: GraphModel): GraphTab {
	return {
		type: "graph",
		graphKind: model.kind,
		graphId: model.id,
		translate: {
			x: 0,
			y: 0,
		} as XY,
		scale: 1,
		selectedItemIds: [] as SelectedItemID[],
	};
}

export function makeFunctionTab(fn: { id: number; graphId: number }): FunctionTab {
	return {
		type: "function",
		graphKind: "function",
		graphId: fn.graphId,
		functionId: fn.id,
		translate: { x: 0, y: 0 } as XY,
		scale: 1,
		selectedItemIds: [] as SelectedItemID[],
	};
}

export function makeQueueTab(queue: { id: number; graphId: number }): QueueTab {
	return {
		type: "queue",
		graphKind: "queue",
		graphId: queue.graphId,
		queueId: queue.id,
		translate: { x: 0, y: 0 } as XY,
		scale: 1,
		selectedItemIds: [] as SelectedItemID[],
	};
}

export function makeFunctionQueueTab(queue: { id: number }): FunctionQueueTab {
	return {
		type: "functionQueue",
		functionQueueId: queue.id,
	};
}

export type GraphContext = {
	model: Solid.Accessor<GraphModel>;
	state: GraphViewState;
	offset: XY;
	toGraphSpace(pos: XY): XY;
	toScreenSpace(pos: XY): XY;
};

export const [GraphContextProvider, useGraphContext] = createContextProvider(
	(props: { value: GraphContext }) => props.value,
	null!,
);
