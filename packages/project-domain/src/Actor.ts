import { Context, Layer } from "effect";
import * as S from "effect/Schema";

export const Actor = S.Union(
	S.Struct({ type: S.Literal("SYSTEM") }),
	S.Struct({ type: S.Literal("CLIENT"), id: S.String }),
);
export type Actor = typeof Actor.Type;

export class Current extends Context.Tag("Actor/Current")<Current, Actor>() {}

export const layerSystem = Layer.succeed(Current, { type: "SYSTEM" });
