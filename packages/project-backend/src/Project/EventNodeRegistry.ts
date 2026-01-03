import { Effect } from "effect";
import type { Graph, Node } from "@macrograph/project-domain";

export class EventNodeRegistry extends Effect.Service<EventNodeRegistry>()(
	"EventNodeRegistry",
	{
		sync: () => {
			const eventNodes = new Map<Graph.Id, Map<string, Set<Node.Id>>>();

			const registerNode = (
				graphId: Graph.Id,
				nodeId: Node.Id,
				packageId: string,
			) => {
				const graphEventNodes =
					eventNodes.get(graphId) ??
					(() => {
						const nodes = new Map<string, Set<Node.Id>>();
						eventNodes.set(graphId, nodes);
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
			};

			const unregisterNode = (
				graphId: Graph.Id,
				nodeId: Node.Id,
				packageId: string,
			) => {
				const graphEventNodes = eventNodes.get(graphId);
				if (!graphEventNodes) return;

				const packageEventNodes = graphEventNodes.get(packageId);
				if (!packageEventNodes) return;

				packageEventNodes.delete(nodeId);
			};

			return { registerNode, unregisterNode };
		},
	},
) {}
