import type { Core, GraphKind } from "@macrograph/runtime";

import type * as serde from "./serde";

export type NodeDropReason = "unknown_schema" | "event_on_wrong_graph";

export type NodeSchemaRef = {
	package: string;
	id: string;
	properties?: serde.Node["properties"];
};

export const CUSTOM_EVENTS_PACKAGE = "Custom Events";
export const CUSTOM_EVENT_SCHEMA = "Custom Event";
export const EMIT_CUSTOM_EVENT_SCHEMA = "Emit Custom Event";

export type DroppedNodeIssue = {
	nodeId: number;
	nodeName: string;
	package: string;
	schemaId: string;
	reason: NodeDropReason;
};

export type GraphLoadIssues = {
	graphKind: GraphKind;
	graphId: number;
	graphName: string;
	droppedNodes: DroppedNodeIssue[];
};

export type UniqueDroppedType = {
	key: string;
	package: string;
	schemaId: string;
	reason: NodeDropReason;
	nodeCount: number;
};

export type ProjectLoadAnalysis = {
	graphs: GraphLoadIssues[];
	uniqueDroppedTypes: UniqueDroppedType[];
	orphanConnectionCount: number;
	droppedNodeCount: number;
	hasIssues: boolean;
};

export const GRAPH_KIND_LABELS: Record<GraphKind, string> = {
	graph: "Graph",
	function: "Function",
	queue: "Queue",
	functionQueue: "Function queue",
};

export const NODE_DROP_REASON_LABELS: Record<NodeDropReason, string> = {
	unknown_schema: "Node type no longer exists in this version",
	event_on_wrong_graph: "Event nodes are not allowed on this graph type",
};

export const PRINT_NODE_REF: NodeSchemaRef = { package: "Utils", id: "Print" };
export const CONSOLE_LOG_NODE_REF: NodeSchemaRef = {
	package: "Utils",
	id: "Console Log",
};

export function nodeTypeKey(pkg: string, schemaId: string): string {
	return `${pkg}/${schemaId}`;
}

/** Unique key for replacement dropdown options (custom events share schema ids). */
export function replacementOptionKey(ref: NodeSchemaRef): string {
	const base = nodeTypeKey(ref.package, ref.id);
	const eventId = ref.properties?.event;
	if (eventId !== undefined) return `${base}#event=${eventId}`;
	return base;
}

function hasNewFormat(data: serde.Project): boolean {
	return (
		(data.functionGraphs && data.functionGraphs.length > 0) ||
		(data.queueGraphs && data.queueGraphs.length > 0) ||
		(data.functionQueueGraphs && data.functionQueueGraphs.length > 0)
	);
}

function legacyGraphKind(
	graphId: number,
	data: serde.Project,
): GraphKind {
	const fnIds = new Set((data.functions ?? []).map((f) => f.graphId));
	if (fnIds.has(graphId)) return "function";

	const queueIds = new Set(
		(data.queues ?? [])
			.map((q) => q.graphId)
			.filter((id): id is number => id !== undefined),
	);
	if (queueIds.has(graphId)) return "queue";

	const fnQueueIds = new Set(
		(data.functionQueues ?? [])
			.map((q) => q.graphId)
			.filter((id): id is number => id !== undefined),
	);
	if (fnQueueIds.has(graphId)) return "functionQueue";

	return "graph";
}

type GraphEntry = { graph: serde.Graph; kind: GraphKind };

export function enumerateProjectGraphs(data: serde.Project): GraphEntry[] {
	if (hasNewFormat(data)) {
		return [
			...data.graphs.map((graph) => ({ graph, kind: "graph" as const })),
			...(data.functionGraphs ?? []).map((graph) => ({
				graph,
				kind: "function" as const,
			})),
			...(data.queueGraphs ?? []).map((graph) => ({
				graph,
				kind: "queue" as const,
			})),
			...(data.functionQueueGraphs ?? []).map((graph) => ({
				graph,
				kind: "functionQueue" as const,
			})),
		];
	}

	return data.graphs.map((graph) => ({
		graph,
		kind: legacyGraphKind(graph.id, data),
	}));
}

export function migratePrintNodeToConsoleLog(node: serde.Node): serde.Node | null {
	if (
		node.schema.package !== PRINT_NODE_REF.package ||
		node.schema.id !== PRINT_NODE_REF.id
	) {
		return null;
	}

	return {
		...node,
		schema: { ...CONSOLE_LOG_NODE_REF },
		properties: {
			...node.properties,
			type: node.properties?.type ?? "log",
		},
	};
}

/** Silently upgrade legacy Print nodes to Console Log (same input pin). */
export function applyAutoMigrations(data: serde.Project): {
	project: serde.Project;
	printMigratedCount: number;
} {
	const project = structuredClone(data) as serde.Project;
	let printMigratedCount = 0;

	for (const { graph } of enumerateProjectGraphs(project)) {
		for (const [idStr, node] of Object.entries(graph.nodes)) {
			const migrated = migratePrintNodeToConsoleLog(node);
			if (!migrated) continue;
			graph.nodes[Number(idStr)] = migrated;
			printMigratedCount++;
		}
	}

	return { project, printMigratedCount };
}

export function getNodeDropReason(
	core: Core,
	graphKind: GraphKind,
	node: serde.Node,
): NodeDropReason | null {
	const schema = core.schema(node.schema.package, node.schema.id);
	if (!schema) return "unknown_schema";

	const isEvent =
		"event" in schema || ("type" in schema && schema.type === "event");
	if (isEvent && graphKind !== "graph") return "event_on_wrong_graph";

	return null;
}

function collectUniqueDroppedTypes(
	graphs: GraphLoadIssues[],
): UniqueDroppedType[] {
	const map = new Map<string, UniqueDroppedType>();

	for (const graph of graphs) {
		for (const node of graph.droppedNodes) {
			const key = nodeTypeKey(node.package, node.schemaId);
			const existing = map.get(key);
			if (existing) {
				existing.nodeCount++;
				continue;
			}
			map.set(key, {
				key,
				package: node.package,
				schemaId: node.schemaId,
				reason: node.reason,
				nodeCount: 1,
			});
		}
	}

	return [...map.values()].sort((a, b) =>
		`${a.package}/${a.schemaId}`.localeCompare(`${b.package}/${b.schemaId}`),
	);
}

export function listReplacementSchemaOptions(
	core: Core,
	project: serde.Project,
	reason: NodeDropReason,
): Array<NodeSchemaRef & { label: string }> {
	const options: Array<NodeSchemaRef & { label: string }> = [];

	for (const pkg of core.packages) {
		for (const schema of pkg.schemas.values()) {
			if (!("type" in schema)) continue;
			if ("internal" in schema && schema.internal) continue;

			const isEvent =
				"event" in schema || ("type" in schema && schema.type === "event");
			if (reason === "event_on_wrong_graph" && isEvent) continue;

			// Custom Events package: per-event entries are added below.
			if (pkg.name === CUSTOM_EVENTS_PACKAGE) continue;

			options.push({
				package: pkg.name,
				id: schema.name,
				label: `${pkg.name} / ${schema.name}`,
			});
		}
	}

	const hasCustomEventListener = !!core.schema(
		CUSTOM_EVENTS_PACKAGE,
		CUSTOM_EVENT_SCHEMA,
	);
	const hasEmitCustomEvent = !!core.schema(
		CUSTOM_EVENTS_PACKAGE,
		EMIT_CUSTOM_EVENT_SCHEMA,
	);

	for (const event of project.customEvents ?? []) {
		const eventName = event.name ?? `Event ${event.id}`;

		if (hasCustomEventListener && reason !== "event_on_wrong_graph") {
			options.push({
				package: CUSTOM_EVENTS_PACKAGE,
				id: CUSTOM_EVENT_SCHEMA,
				properties: { event: event.id },
				label: `${CUSTOM_EVENTS_PACKAGE} / ${eventName}`,
			});
		}

		if (hasEmitCustomEvent) {
			options.push({
				package: CUSTOM_EVENTS_PACKAGE,
				id: EMIT_CUSTOM_EVENT_SCHEMA,
				properties: { event: event.id },
				label: `${CUSTOM_EVENTS_PACKAGE} / Emit ${eventName}`,
			});
		}
	}

	return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function formatReplacementLabel(
	project: serde.Project,
	ref: NodeSchemaRef,
): string {
	if (
		ref.package === CUSTOM_EVENTS_PACKAGE &&
		ref.properties?.event !== undefined
	) {
		const event = (project.customEvents ?? []).find(
			(e) => e.id === ref.properties!.event,
		);
		const name = event?.name ?? `Event ${ref.properties.event}`;
		if (ref.id === EMIT_CUSTOM_EVENT_SCHEMA) {
			return `${CUSTOM_EVENTS_PACKAGE} / Emit ${name}`;
		}
		return `${CUSTOM_EVENTS_PACKAGE} / ${name}`;
	}
	return `${ref.package} / ${ref.id}`;
}

export function analyzeProjectLoad(
	core: Core,
	data: serde.Project,
): ProjectLoadAnalysis {
	const graphs: GraphLoadIssues[] = [];
	let orphanConnectionCount = 0;
	let droppedNodeCount = 0;

	for (const { graph, kind } of enumerateProjectGraphs(data)) {
		const droppedNodes: DroppedNodeIssue[] = [];
		const keptNodeIds = new Set<number>();

		for (const [idStr, node] of Object.entries(graph.nodes)) {
			const reason = getNodeDropReason(core, kind, node);
			if (reason) {
				droppedNodes.push({
					nodeId: Number(idStr),
					nodeName: node.name,
					package: node.schema.package,
					schemaId: node.schema.id,
					reason,
				});
				droppedNodeCount++;
				continue;
			}
			keptNodeIds.add(Number(idStr));
		}

		for (const conn of graph.connections ?? []) {
			if (
				!keptNodeIds.has(conn.from.node) ||
				!keptNodeIds.has(conn.to.node)
			) {
				orphanConnectionCount++;
			}
		}

		if (droppedNodes.length > 0) {
			graphs.push({
				graphKind: kind,
				graphId: graph.id,
				graphName: graph.name,
				droppedNodes,
			});
		}
	}

	const uniqueDroppedTypes = collectUniqueDroppedTypes(graphs);

	return {
		graphs,
		uniqueDroppedTypes,
		orphanConnectionCount,
		droppedNodeCount,
		hasIssues: droppedNodeCount > 0 || orphanConnectionCount > 0,
	};
}

export function sanitizeProjectForLoad(
	core: Core,
	data: serde.Project,
	replacements: Record<string, NodeSchemaRef | null> = {},
): serde.Project {
	const result = structuredClone(data) as serde.Project;

	for (const { graph, kind } of enumerateProjectGraphs(result)) {
		const keptNodes: serde.Graph["nodes"] = {};

		for (const [idStr, node] of Object.entries(graph.nodes)) {
			const reason = getNodeDropReason(core, kind, node);
			if (!reason) {
				keptNodes[Number(idStr)] = node;
				continue;
			}

			const key = nodeTypeKey(node.schema.package, node.schema.id);
			const replacement = replacements[key];
			if (replacement && core.schema(replacement.package, replacement.id)) {
				const replaced: serde.Node = {
					...node,
					schema: {
						package: replacement.package,
						id: replacement.id,
					},
					properties: replacement.properties ?? node.properties,
				};
				if (!getNodeDropReason(core, kind, replaced)) {
					keptNodes[Number(idStr)] = replaced;
				}
			}
		}

		graph.nodes = keptNodes;
		const keptIds = new Set(Object.keys(keptNodes).map(Number));
		graph.connections = (graph.connections ?? []).filter(
			(c) => keptIds.has(c.from.node) && keptIds.has(c.to.node),
		);
	}

	return result;
}
