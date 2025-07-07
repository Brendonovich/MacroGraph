import { Graph, Node } from "@macrograph/server-domain";
import { Effect } from "effect";

import { Graphs } from "./Graph";
// import { RealtimePubSub } from "../Realtime/PubSub";
// import { Graphs } from "../Graph/Graphs";
import { RealtimePubSub } from "./Realtime";

export const NodeRpcsLive = Node.Rpcs.toLayer(
	Effect.gen(function* () {
		const realtime = yield* RealtimePubSub;

		return {
			SetNodePosition: Effect.fn(function* (payload) {
				const graphs = yield* Graphs;
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

				const node = graph.nodes.find((node) => node.id === payload.nodeId);
				if (!node) return;

				node.position = payload.position;

				yield* realtime.publish({
					type: "NodeMoved",
					graphId: graph.id,
					nodeId: node.id,
					position: payload.position,
				});
			}),
			SetNodePositions: Effect.fn(function* (payload) {
				const graphs = yield* Graphs;
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
			}),
		};
	}),
);
