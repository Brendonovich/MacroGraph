import { DataInput, type Graph, splitIORef } from "@macrograph/runtime";
import type { t } from "@macrograph/typesystem";

export type CompiledEdge = {
	outNodeId: number;
	inNodeId: number;
	output: unknown;
	input: unknown;
	inputType: t.Any | null;
};

let lastGraphKey = "";
const parsedRefCache = new Map<string, ReturnType<typeof splitIORef>>();
let compiledEdges: CompiledEdge[] = [];
let compiledEdgesKey = "";

function parseIORefCached(ref: string) {
	const cached = parsedRefCache.get(ref);
	if (cached) return cached;
	const parsed = splitIORef(ref);
	parsedRefCache.set(ref, parsed);
	return parsed;
}

export function getCompiledEdges(graph: Graph): CompiledEdge[] {
	const graphKey = `${graph.kind}:${graph.id}`;
	const compiledKey = `${graphKey}:${graph.connections.size}`;
	if (graphKey !== lastGraphKey) {
		lastGraphKey = graphKey;
		parsedRefCache.clear();
		compiledEdges = [];
		compiledEdgesKey = "";
	}
	if (compiledKey !== compiledEdgesKey) {
		compiledEdges = [];
		for (const [refStr, conns] of graph.connections) {
			const outRef = parseIORefCached(refStr);
			if (outRef.type === "i") continue;
			const output = graph.nodes.get(outRef.nodeId)?.output(outRef.ioId);
			if (!output) continue;

			for (const conn of conns) {
				const inRef = parseIORefCached(conn);
				const input = graph.nodes.get(inRef.nodeId)?.input(inRef.ioId);
				if (!input) continue;

				compiledEdges.push({
					outNodeId: outRef.nodeId,
					inNodeId: inRef.nodeId,
					output,
					input,
					inputType: input instanceof DataInput ? input.type : null,
				});
			}
		}
		compiledEdgesKey = compiledKey;
	}
	return compiledEdges;
}
