import type { Graph as GraphModel, XY } from "@macrograph/runtime";
import { createContextProvider } from "@solid-primitives/context";
import type * as Solid from "solid-js";

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

export function makeGraphState(model: GraphModel) {
	return {
		id: model.id,
		translate: {
			x: 0,
			y: 0,
		} as XY,
		scale: 1,
		selectedItemIds: [] as SelectedItemID[],
	};
}

export type GraphState = ReturnType<typeof makeGraphState>;

export type GraphContext = {
	model: Solid.Accessor<GraphModel>;
	state: GraphState;
	offset: XY;
	toGraphSpace(pos: XY): XY;
	toScreenSpace(pos: XY): XY;
};

export const [GraphContextProvider, useGraphContext] = createContextProvider(
	(props: { value: GraphContext }) => props.value,
	null!,
);
