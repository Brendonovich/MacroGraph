import type { Graph as GraphModel, XY } from "@macrograph/runtime";
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
	graphId: number;
	translate: XY;
	scale: number;
	selectedItemIds: SelectedItemID[];
};

export type GraphTab = GraphViewState & { type: "graph" };
export type FunctionTab = GraphViewState & { type: "function"; functionId: number };
export type QueueTab = GraphViewState & { type: "queue"; queueId: number };
export type SettingsTab = { type: "settings" };
export type PackageTab = { type: "package"; packageName: string };

export type TabState = GraphTab | FunctionTab | QueueTab | SettingsTab | PackageTab;

export function makeGraphState(model: GraphModel): GraphTab {
	return {
		type: "graph",
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
		graphId: queue.graphId,
		queueId: queue.id,
		translate: { x: 0, y: 0 } as XY,
		scale: 1,
		selectedItemIds: [] as SelectedItemID[],
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
