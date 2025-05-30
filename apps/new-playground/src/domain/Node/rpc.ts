import { Rpc, RpcGroup } from "@effect/rpc";
import { Effect, Schema as S } from "effect";

import { GraphId } from "../Graph/data";
import { XY } from "./data";
import { Graphs } from "../Graph/rpc";
import { RealtimePubSub } from "../Realtime/PubSub";
import { RpcRealtimeMiddleware } from "../Rpc/Middleware";

export const NodeRpcs = RpcGroup.make(
  Rpc.make("SetNodePosition", {
    payload: {
      nodeId: S.Int,
      graphId: GraphId,
      position: XY,
    },
  }),
).middleware(RpcRealtimeMiddleware);

export const NodeRpcsLive = NodeRpcs.toLayer(
  Effect.gen(function* () {
    const realtime = yield* RealtimePubSub;

    return {
      SetNodePosition: Effect.fn(function* (payload) {
        const graphs = yield* Graphs;
        const graph = yield* graphs.get();

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
    };
  }),
);
