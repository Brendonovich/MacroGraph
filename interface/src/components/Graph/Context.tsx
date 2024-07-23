import type {
	Graph as GraphModel,
	Node as NodeModel,
	Pin,
	Size,
	XY,
} from "@macrograph/runtime";
import type { ReactiveWeakMap } from "@solid-primitives/map";
import * as Solid from "solid-js";

export type SelectedItemID =
	| { type: "node"; id: number }
	| { type: "commentBox"; id: number };

export function toGraphSpace(clientXY: XY, bounds: XY, state: GraphState) {
	return {
		x: (clientXY.x - bounds.x) / state.scale + state.translate.x,
		y: (clientXY.y - bounds.y) / state.scale + state.translate.y,
	};
}

export function toScreenSpace(graphXY: XY, bounds: XY, state: GraphState) {
	return {
		x: (graphXY.x - state.translate.x) * state.scale + bounds.x,
		y: (graphXY.y - state.translate.y) * state.scale + bounds.y,
	};
}

export function createGraphState(model: GraphModel) {
	return {
		id: model.id,
		translate: {
			x: 0,
			y: 0,
		} as XY,
		scale: 1,
		selectedItemId: null as SelectedItemID | null,
	};
}

export type GraphState = ReturnType<typeof createGraphState>;

export const GraphContext = Solid.createContext<{
	model: Solid.Accessor<GraphModel>;
	pinPositions: ReactiveWeakMap<Pin, XY>;
	schemaMenuDrag: Solid.Accessor<{ pin: Pin; mousePos: XY } | null>;
	nodeSizes: WeakMap<NodeModel, Size>;
	state: GraphState;
	offset: XY;
	toGraphSpace(pos: XY): XY;
	toScreenSpace(pos: XY): XY;
} | null>(null);

export const useGraphContext = () => {
	const ctx = Solid.useContext(GraphContext);

	if (!ctx) throw new Error("CurrentGraphContext is missing!");

	return ctx;
};
