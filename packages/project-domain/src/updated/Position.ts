import * as S from "effect/Schema";

export class Position extends S.Class<Position>("Position")({
	x: S.Number,
	y: S.Number,
}) {}

export const GraphPosition = Position.pipe(S.brand("GraphPosition"));
export type GraphPosition = S.Schema.Type<typeof GraphPosition>;
