import { Rpc, RpcGroup, RpcSerialization } from "@effect/rpc";
import { Schema as S } from "effect";

import { NodeNotFound, SchemaNotFound } from "./errors";
import { Graph, GraphId } from "./domain/Graph/data";
import { NodeId, NodeIO, NodeVariant } from "./domain/Node/data";
import { RpcRealtimeMiddleware } from "./domain/Rpc/Middleware";
import { SchemaRef } from "./domain/Package/data";
import { GraphNotFoundError } from "./domain/Graph/error";

export const IORef = S.Struct({
  nodeId: NodeId,
  ioId: S.String,
});

export const IOVariant = S.Union(S.Literal("exec"), S.Literal("data"));

// export const NodeIO = S.Struct({
//   inputs: S.Array(
//     S.Struct({
//       id: S.String,
//       variant: IOVariant,
//       name: S.optional(S.String),
//     }),
//   ),
//   outputs: S.Array(
//     S.Struct({
//       id: S.String,
//       variant: IOVariant,
//       name: S.optional(S.String),
//     }),
//   ),
// });

export const XY = S.Struct({
  x: S.Number,
  y: S.Number,
});

export type ProjectEvent = (typeof ProjectEvent)["Type"];
export const ProjectEvent = S.Union(
  makeEvent("authChanged", {
    data: S.NullOr(S.Struct({ id: S.String })),
  }),
  makeEvent("packageAdded", {
    data: S.Struct({
      package: S.String,
    }),
  }),
  makeEvent("packageStateChanged", {
    package: S.String,
  }),
  makeEvent("connectedClientsChanged", {
    data: S.Int,
  }),
  makeEvent("PresenceUpdated", {
    data: S.Record({
      key: S.String,
      value: S.Struct({
        name: S.String,
        colour: S.String,
        mouse: S.optional(
          S.Struct({
            graph: GraphId,
            x: S.Number,
            y: S.Number,
          }),
        ),
        selection: S.optional(
          S.Struct({
            graph: GraphId,
            nodes: S.Array(NodeId),
          }),
        ),
      }),
    }),
  }),
  makeEvent("NodeMoved", {
    graphId: GraphId,
    nodeId: NodeId,
    position: XY,
  }),
  makeEvent("NodesMoved", {
    graphId: GraphId,
    positions: S.Array(S.Tuple(NodeId, XY)),
  }),
  S.extend(
    makeEvent("NodeCreated", {
      name: S.optional(S.String),
      graphId: GraphId,
      nodeId: NodeId,
      schema: SchemaRef,
      position: XY,
    }),
    NodeIO,
  ),
  makeEvent("IOConnected", {
    graphId: GraphId,
    output: IORef,
    input: IORef,
  }),
  makeEvent("IODisconnected", {
    graphId: GraphId,
    io: S.extend(IORef, S.Struct({ type: S.Literal("i", "o") })),
  }),
  makeEvent("SelectionDeleted", {
    graphId: GraphId,
    selection: S.Array(NodeId),
  }),
);

function makeEvent<S extends string, F extends S.Struct.Fields>(
  type: S,
  fields: F,
) {
  return S.Struct({
    ...fields,
    type: S.Literal(type),
  });
}

const SchemaMeta = S.Struct({
  id: S.String,
  name: S.optional(S.String),
  type: S.Union(S.Literal("exec"), S.Literal("pure"), S.Literal("event")),
});
export type SchemaMeta = S.Schema.Type<typeof SchemaMeta>;

const PackageMeta = S.Struct({
  schemas: S.Record({
    key: S.String,
    value: SchemaMeta,
  }),
});
export type PackageMeta = S.Schema.Type<typeof PackageMeta>;

export const Rpcs = RpcGroup.make(
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
  Rpc.make("GetProject", {
    success: S.Struct({
      name: S.String,
      graphs: S.Record({ key: S.String, value: Graph }),
      packages: S.Record({ key: S.String, value: PackageMeta }),
    }),
  }),
  // Rpc.make("Events", {
  //   stream: true,
  //   success: ProjectEvent,
  // }),
  Rpc.make("GetPackageSettings", {
    payload: { package: S.String },
    success: S.Any,
  }),
  Rpc.make("SetMousePosition", {
    payload: S.Struct({
      graph: GraphId,
      position: S.Struct({ x: S.Number, y: S.Number }),
    }),
  }),
  Rpc.make("SetSelection", {
    payload: {
      value: S.NullOr(
        S.Struct({
          graph: GraphId,
          nodes: S.Array(NodeId),
        }),
      ),
    },
  }),
  Rpc.make("DeleteSelection", {
    payload: {
      graph: GraphId,
      selection: S.Array(NodeId),
    },
    error: S.Union(GraphNotFoundError, NodeNotFound),
  }),
).middleware(RpcRealtimeMiddleware);

export const RpcsSerialization = RpcSerialization.layerJson;
