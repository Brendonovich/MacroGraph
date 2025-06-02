import { Schema as S } from "effect";

import { SchemaRef } from "../Package/data";

const IOType = S.Union(
  S.Struct({ variant: S.Literal("exec") }),
  S.Struct({
    variant: S.Literal("data"),
    data: S.Literal("string", "bool", "float", "int"),
  }),
);
export type IOType = S.Schema.Type<typeof IOType>;

export const IOVariant = S.Union(S.Literal("exec"), S.Literal("data"));
export const NodeVariant = S.Union(
  S.Literal("exec"),
  S.Literal("base"),
  S.Literal("pure"),
  S.Literal("event"),
);

export const XY = S.Struct({
  x: S.Number,
  y: S.Number,
});

export const NodeId = S.Int.pipe(S.brand("Node ID"));
export type NodeId = (typeof NodeId)["Type"];

export const NodeIO = S.Struct({
  inputs: S.Array(
    S.extend(S.Struct({ id: S.String, name: S.optional(S.String) }), IOType),
  ),
  outputs: S.Array(
    S.extend(S.Struct({ id: S.String, name: S.optional(S.String) }), IOType),
  ),
});
export type NodeIO = (typeof NodeIO)["Type"];

export const Node = S.extend(
  S.Struct({
    id: NodeId,
    name: S.optional(S.String),
    position: XY,
    schema: SchemaRef,
  }),
  NodeIO,
);
export type Node = (typeof Node)["Type"];
