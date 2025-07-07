import { Schema } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Node } from "@macrograph/domain";

import * as Graph from "./Graph";
import * as Realtime from "./Realtime";
import { Shape as IOShape } from "./IO";
import { Position, SchemaRef } from "./util";

export * from "@macrograph/domain/Node";

export const IO = Schema.Struct({
  inputs: Schema.Array(
    Schema.extend(
      Schema.Struct({
        id: Schema.String,
        name: Schema.optional(Schema.String),
      }),
      IOShape,
    ),
  ),
  outputs: Schema.Array(
    Schema.extend(
      Schema.Struct({
        id: Schema.String,
        name: Schema.optional(Schema.String),
      }),
      IOShape,
    ),
  ),
});
export type IO = Schema.Schema.Type<typeof IO>;

export class NotFound extends Schema.TaggedError<NotFound>()(
  "@macrograph/server-domain/Node/NotFound",
  { nodeId: Node.Id },
) {}

export const Shape = Schema.extend(
  Schema.Struct({
    id: Node.Id,
    name: Schema.optional(Schema.String),
    position: Position,
    schema: SchemaRef,
  }),
  IO,
);
export type Shape = Schema.Schema.Type<typeof Shape>;

export const Rpcs = RpcGroup.make(
  Rpc.make("SetNodePosition", {
    payload: {
      nodeId: Schema.Int,
      graphId: Graph.Id,
      position: Position,
    },
    error: Graph.NotFound,
  }),
  Rpc.make("SetNodePositions", {
    payload: {
      graphId: Graph.Id,
      positions: Schema.Array(Schema.Tuple(Node.Id, Position)),
    },
    error: Schema.Union(Graph.NotFound, NotFound),
  }),
).middleware(Realtime.ConnectionRpcMiddleware);
