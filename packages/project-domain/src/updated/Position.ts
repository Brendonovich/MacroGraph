import * as S from "effect/Schema";

export const Position = S.Struct({ x: S.Number, y: S.Number });
export type Position = S.Schema.Type<typeof Position>;

export const GraphPosition = Position.pipe(S.brand("GraphPosition"));
export type GraphPosition = S.Schema.Type<typeof GraphPosition>;
