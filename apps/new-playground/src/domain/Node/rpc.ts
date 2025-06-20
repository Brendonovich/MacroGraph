import { Rpc, RpcGroup } from "@effect/rpc";
import { Effect, Schema as S } from "effect";

import { GraphId } from "../Graph/data";
import { NodeId, XY } from "./data";
import { RealtimePubSub } from "../Realtime/PubSub";
import { RpcRealtimeMiddleware } from "../Rpc/Middleware";
import { GraphNotFoundError } from "../Graph/error";
import { Graphs } from "../Graph/Graphs";

class NodeNotFoundError extends S.TaggedError<NodeNotFoundError>(
  "NodeNotFoundError",
)("NodeNotFoundError", {}) {}

export const NodeRpcs = RpcGroup.make(
  Rpc.make("SetNodePosition", {
    payload: {
      nodeId: S.Int,
      graphId: GraphId,
      position: XY,
    },
    error: GraphNotFoundError,
  }),
  Rpc.make("SetNodePositions", {
    payload: {
      graphId: GraphId,
      positions: S.Array(S.Tuple(NodeId, XY)),
    },
    error: S.Union(GraphNotFoundError, NodeNotFoundError),
  }),
).middleware(RpcRealtimeMiddleware);

export const NodeRpcsLive = NodeRpcs.toLayer(
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
                () => new GraphNotFoundError({ graphId: payload.graphId }),
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
                () => new GraphNotFoundError({ graphId: payload.graphId }),
              ),
            ),
          );

        const positions: Array<{
          node: NodeId;
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
