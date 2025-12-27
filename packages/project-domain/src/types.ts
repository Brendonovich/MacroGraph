import { Schema } from "effect";

export const Position = Schema.Struct({
	x: Schema.Number,
	y: Schema.Number,
}).pipe(Schema.mutable);
export type Position = Schema.Schema.Type<typeof Position>;
