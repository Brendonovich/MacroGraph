import { Context, Effect, Iterable, Option, pipe, Schema } from "effect";
import {
	SchemaNotFound,
	type Graph,
	type Node,
	type SchemaRef,
	type SchemaType,
} from "@macrograph/project-domain";

import { ProjectShape } from "./Data";

export class NodeSchemas extends Context.Tag("NodeSchemas")<
	NodeSchemas,
	{ getSchema(schema: SchemaRef): Option.Option<{ type: SchemaType }> }
>() {}

class ProjectRuntime {
	constructor(
		private state: ProjectShape,
		private eventNodes: EventNodeRegistry,
	) {}

	static create = (v: Schema.Schema.Encoded<ProjectShape>) =>
		Effect.gen(function* () {
			const schemas = yield* NodeSchemas;
			const state = yield* Schema.decode(ProjectShape)(v);

			const eventNodes = new EventNodeRegistry();

			for (const graph of state.graphs.values()) {
				for (const node of graph.nodes) {
					const schema = yield* schemas
						.getSchema(node.schema)
						.pipe(Effect.catchAll(() => new SchemaNotFound(node.schema)));

					if (schema.type === "event")
						eventNodes.registerNode(graph.id, node.id, node.schema.pkgId);
				}
			}

			return new ProjectRuntime(state, eventNodes);
		});

	handleEvent = (pkgId: string, event: any) => {
		const eventNodes = this.eventNodes;

		return Effect.gen(function* () {
			for (const { graphId, nodes } of eventNodes.lookup(pkgId)) {
				for (const nodeId of nodes) {
					yield* Effect.log({ nodeId });
					// yield* Effect.void;
				}
			}
		});
	};

	test() {}
}

class EventNodeRegistry {
	eventNodes = new Map<Graph.Id, Map<string, Set<Node.Id>>>();

	registerNode(graphId: Graph.Id, nodeId: Node.Id, packageId: string) {
		const graphEventNodes =
			this.eventNodes.get(graphId) ??
			(() => {
				const nodes = new Map<string, Set<Node.Id>>();
				this.eventNodes.set(graphId, nodes);
				return nodes;
			})();

		const packageEventNodes =
			graphEventNodes.get(packageId) ??
			(() => {
				const nodes = new Set<Node.Id>();
				graphEventNodes.set(packageId, nodes);
				return nodes;
			})();

		packageEventNodes.add(nodeId);
	}

	unregisterNode(graphId: Graph.Id, nodeId: Node.Id, packageId: string) {
		const graphEventNodes = this.eventNodes.get(graphId);
		if (!graphEventNodes) return;

		const packageEventNodes = graphEventNodes.get(packageId);
		if (!packageEventNodes) return;

		packageEventNodes.delete(nodeId);
	}

	lookup(packageId: string) {
		return pipe(
			this.eventNodes.entries(),
			Iterable.filterMap(([graphId, nodes]) =>
				Option.fromNullable(nodes.get(packageId)).pipe(
					Option.map((nodes) => ({ graphId, nodes: nodes.values() }) as const),
				),
			),
		);
	}
}
