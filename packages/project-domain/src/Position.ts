import * as S from "effect/Schema";

export const Position = S.Struct({ x: S.Number, y: S.Number });
export type Position = typeof Position.Type;

export const GraphPosition = Position.pipe(S.brand("GraphPosition"));
export type GraphPosition = typeof GraphPosition.Type;
