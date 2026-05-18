import type { GraphKind } from "./Project";

export type GraphRef = {
	graphKind: GraphKind;
	graphId: number;
};

export function graphRefOf(graph: { kind: GraphKind; id: number }): GraphRef {
	return { graphKind: graph.kind, graphId: graph.id };
}

export function graphRefKey(ref: GraphRef): string {
	return `${ref.graphKind}:${ref.graphId}`;
}

export function graphRefsEqual(a: GraphRef, b: GraphRef): boolean {
	return a.graphKind === b.graphKind && a.graphId === b.graphId;
}
