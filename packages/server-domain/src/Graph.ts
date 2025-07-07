export * from "@macrograph/domain/Graph";

import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { Graph, SchemaNotFound } from "@macrograph/domain";

import * as Node from "./Node";
import * as Realtime from "./Realtime";
import { SchemaRef } from "./util";

export const Shape = Schema.Struct({
  id: Graph.Id,
  name: Schema.String,
  nodes: Schema.Array(Node.Shape),
  connections: Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(Schema.Tuple(Node.Id, Schema.String)),
    }),
  }),
});
export type Shape = (typeof Shape)["Type"];

export const Rpcs = RpcGroup.make(
  Rpc.make("CreateNode", {
    payload: {
      schema: SchemaRef,
      graphId: Graph.Id,
      position: Schema.Tuple(Schema.Number, Schema.Number),
    },
    success: Schema.Struct({
      id: Node.Id,
      io: Node.IO,
    }),
    error: Schema.Union(SchemaNotFound),
  }),
  Rpc.make("ConnectIO", {
    payload: {
      graphId: Graph.Id,
      output: Node.IORef,
      input: Node.IORef,
    },
    error: Schema.Union(Graph.NotFound, Node.NotFound),
  }),
  Rpc.make("DisconnectIO", {
    payload: Schema.Struct({
      graphId: Graph.Id,
      io: Schema.extend(
        Node.IORef,
        Schema.Struct({ type: Schema.Literal("i", "o") }),
      ),
    }),
    error: Schema.Union(Graph.NotFound, Node.NotFound),
  }),
  Rpc.make("DeleteSelection", {
    payload: {
      graph: Graph.Id,
      selection: Schema.Array(Node.Id),
    },
    error: Schema.Union(Graph.NotFound, Node.NotFound),
  }),
).middleware(Realtime.ConnectionRpcMiddleware);
