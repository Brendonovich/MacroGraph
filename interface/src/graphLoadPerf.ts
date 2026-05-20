import type { Graph } from "@macrograph/runtime";

type GraphRef = Pick<Graph, "kind" | "id">;

export type GraphLoadSource = "sidebarClick" | "tabSwitch";

const ENABLED =
	typeof globalThis !== "undefined" &&
	(globalThis as { __GRAPH_LOAD_PERF__?: boolean }).__GRAPH_LOAD_PERF__ !== false;

interface Session {
	key: string;
	name: string;
	source: GraphLoadSource;
	startMs: number;
	nodeCount: number;
	milestones: Map<string, number>;
	details: Map<string, number | string>;
}

let session: Session | null = null;

function graphKey(graph: GraphRef) {
	return `${graph.kind}:${graph.id}`;
}

function elapsedMs() {
	return Math.round(performance.now() - (session?.startMs ?? performance.now()));
}

function buildSegmentDurations(milestones: Record<string, number>) {
	const ordered = Object.entries(milestones)
		.filter(([name]) => name !== "loaded")
		.sort((a, b) => a[1] - b[1]);

	const segments: Record<string, number> = {};
	for (let i = 0; i < ordered.length; i++) {
		const [name, at] = ordered[i]!;
		const prevAt = i > 0 ? ordered[i - 1]![1] : 0;
		segments[name] = at - prevAt;
	}

	const loaded = milestones.loaded;
	if (loaded !== undefined && ordered.length > 0) {
		segments.loaded = loaded - ordered[ordered.length - 1]![1];
	}

	return segments;
}

export function beginGraphLoad(graph: Graph, source: GraphLoadSource) {
	if (!ENABLED) return;
	session = {
		key: graphKey(graph),
		name: graph.name,
		source,
		startMs: performance.now(),
		nodeCount: graph.nodes.size,
		milestones: new Map([[source, 0]]),
		details: new Map(),
	};
}

export function markGraphLoadPhase(
	phase: string,
	graph?: GraphRef,
) {
	if (!ENABLED || !session) return;
	if (graph && graphKey(graph) !== session.key) return;
	if (session.milestones.has(phase)) return;
	session.milestones.set(phase, elapsedMs());
}

export function markGraphLoadDetail(
	key: string,
	value: number | string,
	graph?: GraphRef,
) {
	if (!ENABLED || !session) return;
	if (graph && graphKey(graph) !== session.key) return;
	session.details.set(key, value);
}

export function completeGraphLoad(
	graph: GraphRef,
	extra?: Record<string, unknown>,
) {
	if (!ENABLED || !session || graphKey(graph) !== session.key) return;

	const totalMs = elapsedMs();
	const milestones = Object.fromEntries(session.milestones);
	milestones.loaded = totalMs;
	const segmentDurations = buildSegmentDurations(milestones);
	const details = Object.fromEntries(session.details);

	console.log(
		`[GraphLoadPerf] "${session.name}" (${session.nodeCount} nodes) loaded in ${totalMs}ms via ${session.source}`,
		{
			source: session.source,
			milestones,
			segmentDurations,
			details,
			...extra,
		},
	);

	session = null;
}
