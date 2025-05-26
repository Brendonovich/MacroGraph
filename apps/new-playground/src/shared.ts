import { Rpc, RpcGroup, RpcSerialization } from "@effect/rpc";
import { Schema as S } from "effect";
import { NodeNotFound, SchemaNotFound } from "./errors";
import { Graph, GraphId } from "./domain/Graph/data";
import { NodeId } from "./domain/Node/data";

export const SchemaRef = S.Struct({
  pkgId: S.String,
  schemaId: S.String,
});

export const IORef = S.Struct({
  nodeId: S.Int,
  ioId: S.String,
});

export const IOVariant = S.Union(S.Literal("exec"), S.Literal("data"));

export const NodeIO = S.Struct({
  inputs: S.Array(
    S.Struct({
      id: S.String,
      variant: IOVariant,
      name: S.optional(S.String),
    }),
  ),
  outputs: S.Array(
    S.Struct({
      id: S.String,
      variant: IOVariant,
      name: S.optional(S.String),
    }),
  ),
});

export const XY = S.Struct({
  x: S.Number,
  y: S.Number,
});

export type ProjectEvent = (typeof ProjectEvent)["Type"];
export const ProjectEvent = S.Union(
  S.Struct({
    type: S.Literal("authChanged"),
    data: S.NullOr(S.Struct({ id: S.String })),
  }),
  S.Struct({
    type: S.Literal("packageAdded"),
    data: S.Struct({
      package: S.String,
    }),
  }),
  S.Struct({
    type: S.Literal("packageStateChanged"),
    package: S.String,
  }),
  S.Struct({
    type: S.Literal("connectedClientsChanged"),
    data: S.Int,
  }),
  S.Struct({
    type: S.Literal("NodeMoved"),
    graphId: GraphId,
    nodeId: NodeId,
    position: XY,
  }),
);

export const Rpcs = RpcGroup.make(
  // Rpc.make("CreateNode", {
  //   payload: S.Struct({
  //     schema: SchemaRef,
  //   }),
  //   success: S.Struct({
  //     id: S.Int,
  //     io: NodeIO,
  //   }),
  //   error: S.Union(SchemaNotFound),
  // }),
  // Rpc.make("ConnectIO", {
  //   payload: S.Struct({
  //     output: IORef,
  //     input: IORef,
  //   }),
  //   error: S.Union(NodeNotFound),
  // }),
  Rpc.make("GetProject", {
    success: S.Struct({
      name: S.String,
      graphs: S.Record({ key: S.String, value: Graph }),
    }),
  }),
  // Rpc.make("Events", {
  //   stream: true,
  //   success: ProjectEvent,
  // }),
  Rpc.make("GetPackageSettings", {
    payload: S.Struct({ package: S.String }),
    success: S.Any,
  }),
);

export const RpcsSerialization = RpcSerialization.layerJson;
