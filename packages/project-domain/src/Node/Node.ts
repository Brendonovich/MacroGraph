import { Schema } from "effect";

import { Shape as IOShape } from "../IO";
import { Position, SchemaRef } from "../types";

export const Variant = Schema.Literal("exec", "base", "pure", "event");
export type Variant = Schema.Schema.Type<typeof Variant>;

export const Id = Schema.Int.pipe(Schema.brand("Node ID"));
export type Id = Schema.Schema.Type<typeof Id>;

export const IORef = Schema.Struct({
	nodeId: Id,
	ioId: Schema.String,
});
export type IORef = Schema.Schema.Type<typeof IORef>;

export type IORefString = `${Id}:${"i" | "o"}:${string}`;

export function parseIORef(ioRef: IORefString) {
	const [nodeId, type, ...id] = ioRef.split(":");
	return {
		nodeId: Id.make(Number(nodeId)),
		type: type as "i" | "o",
		id: id.join(""),
	};
}

const IOList = Schema.Array(
	Schema.extend(
		Schema.Struct({
			id: Schema.String,
			name: Schema.optional(Schema.String),
		}),
		IOShape,
	).pipe(Schema.mutable),
).pipe(Schema.mutable);

export const IO = Schema.Struct({
	inputs: IOList,
	outputs: IOList,
}).pipe(Schema.mutable);
export type IO = Schema.Schema.Type<typeof IO>;

export const Shape = Schema.extend(
	Schema.Struct({
		id: Id,
		name: Schema.optional(Schema.String),
		position: Position,
		schema: SchemaRef,
	}),
	IO,
).pipe(Schema.mutable);
export type Shape = Schema.Schema.Type<typeof Shape>;

export class NotFound extends Schema.TaggedError<NotFound>()(
	"@macrograph/server-domain/Node/NotFound",
	{ nodeId: Id },
) {}
