import { Rpc, RpcGroup } from "@effect/rpc";
import { Effect, Schema as S } from "effect";

import { NodeNotFound, SchemaNotFound } from "../../errors";
import { GraphId } from "./data";
import { NodeId, NodeIO } from "../Node/data";
import { SchemaRef } from "../Package/data";
import { GraphNotFoundError } from "./error";
import { IORef } from "../../shared";
import { ProjectActions } from "../Project/Actions";
import { RealtimePubSub } from "../Realtime/PubSub";
import { RpcRealtimeMiddleware } from "../Rpc/Middleware";

export const GraphRpcs = RpcGroup.make(
  Rpc.make("CreateNode", {
    payload: {
      schema: SchemaRef,
      graphId: GraphId,
      position: S.Tuple(S.Number, S.Number),
    },
    success: S.Struct({
      id: NodeId,
      io: NodeIO,
    }),
    error: S.Union(SchemaNotFound),
  }),
  Rpc.make("ConnectIO", {
    payload: {
      graphId: GraphId,
      output: IORef,
      input: IORef,
    },
    error: S.Union(GraphNotFoundError, NodeNotFound),
  }),
  Rpc.make("DisconnectIO", {
    payload: S.Struct({
      graphId: GraphId,
      io: S.extend(IORef, S.Struct({ type: S.Literal("i", "o") })),
    }),
    error: S.Union(GraphNotFoundError, NodeNotFound),
  }),
  Rpc.make("DeleteSelection", {
    payload: {
      graph: GraphId,
      selection: S.Array(NodeId),
    },
    error: S.Union(GraphNotFoundError, NodeNotFound),
  }),
).middleware(RpcRealtimeMiddleware);

export const GraphRpcsLive = GraphRpcs.toLayer(
  Effect.gen(function* () {
    const projectActions = yield* ProjectActions;
    const realtime = yield* RealtimePubSub;

    return {
      CreateNode: Effect.fn(function* (payload) {
        const node = yield* projectActions
          .createNode(payload.graphId, payload.schema, [...payload.position])
          .pipe(Effect.mapError(() => new SchemaNotFound(payload.schema)));

        yield* realtime.publish({
          type: "NodeCreated",
          graphId: payload.graphId,
          nodeId: node.id,
          position: node.position,
          schema: payload.schema,
          inputs: node.inputs,
          outputs: node.outputs,
        });

        return {
          id: node.id,
          io: { inputs: node.inputs, outputs: node.outputs },
        };
      }),
      ConnectIO: Effect.fn(function* (payload) {
        yield* projectActions.addConnection(
          payload.graphId,
          payload.output,
          payload.input,
        );

        yield* realtime.publish({
          type: "IOConnected",
          graphId: payload.graphId,
          output: payload.output,
          input: payload.input,
        });
      }),
      DisconnectIO: Effect.fn(function* (payload) {
        yield* projectActions.disconnectIO(payload.graphId, payload.io);

        yield* realtime.publish({
          type: "IODisconnected",
          graphId: payload.graphId,
          io: payload.io,
        });
      }),
      DeleteSelection: Effect.fn(function* (payload) {
        yield* projectActions.deleteSelection(
          payload.graph,
          payload.selection as DeepWriteable<typeof payload.selection>,
        );

        yield* realtime.publish({
          type: "SelectionDeleted",
          graphId: payload.graph,
          selection: payload.selection,
        });
      }),
    };
  }),
);
