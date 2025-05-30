import { Schema as S } from "effect";

import { SchemaRef } from "../Package/data";

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

export const Node = S.Struct({
  id: NodeId,
  name: S.optional(S.String),
  position: XY,
  schema: SchemaRef,
  inputs: S.Array(
    S.Struct({
      id: S.String,
      variant: IOVariant,
      // type: S.Union(S.Literal("string")),
      name: S.optional(S.String),
    }),
  ),
  outputs: S.Array(
    S.Struct({
      id: S.String,
      variant: IOVariant,
      // type: S.Union(S.Literal("string")),
      name: S.optional(S.String),
    }),
  ),
});
export type Node = (typeof Node)["Type"];
