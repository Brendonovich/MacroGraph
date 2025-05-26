import { Schema as S } from "effect";

export const IOVariant = S.Union(S.Literal("exec"), S.Literal("data"));
export const NodeVariant = S.Union(S.Literal("exec"), S.Literal("base"));

export const XY = S.Struct({
  x: S.Number,
  y: S.Number,
});

export const NodeId = S.Int.pipe(S.brand("Node ID"));
export type NodeId = (typeof NodeId)["Type"];

export const Node = S.Struct({
  id: NodeId,
  name: S.String,
  position: XY,
  variant: NodeVariant,
  inputs: S.Array(
    S.Struct({
      id: S.String,
      variant: IOVariant,
      type: S.Union(S.Literal("string")),
      name: S.String,
    }),
  ),
  outputs: S.Array(
    S.Struct({
      id: S.String,
      variant: IOVariant,
      type: S.Union(S.Literal("string")),
      name: S.String,
    }),
  ),
});
