import { Graph, Node, Policy } from "@macrograph/server-domain";
import { Effect } from "effect";

import { Graphs } from "./Graph";
import { RealtimePubSub } from "./Realtime";
import { ServerPolicy } from "./ServerPolicy";

export const NodeRpcsLive = Node.Rpcs.toLayer(
	Effect.gen(function* () {
		const graphs = yield* Graphs;
		const realtime = yield* RealtimePubSub;
		const serverPolicy = yield* ServerPolicy;

		return {
			SetNodePositions: Effect.fn(
				function* (payload) {
					const graph = yield* graphs
						.get(payload.graphId)
						.pipe(
							Effect.andThen(
								Effect.catchTag(
									"NoSuchElementException",
									() => new Graph.NotFound({ graphId: payload.graphId }),
								),
							),
						);

					const positions: Array<{
						node: Node.Id;
						position: { x: number; y: number };
					}> = [];

					for (const [nodeId, position] of payload.positions) {
						const node = graph.nodes.find((node) => node.id === nodeId);
						if (!node) continue;
						node.position = position;
						positions.push({ node: nodeId, position });
					}

					yield* realtime.publish({
						type: "NodesMoved",
						graphId: graph.id,
						positions: payload.positions,
					});
				},
				(e) => e.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			),
		};
	}),
);
