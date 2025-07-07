import { Schema } from "effect";

export const Variant = Schema.Literal("exec", "base", "pure", "event");
export type Variant = Schema.Schema.Type<typeof Variant>;

export const Id = Schema.Int.pipe(Schema.brand("Node ID"));
export type Id = Schema.Schema.Type<typeof Id>;

export const IORef = Schema.Struct({
	nodeId: Id,
	ioId: Schema.String,
});
export type IORef = Schema.Schema.Type<typeof IORef>;
