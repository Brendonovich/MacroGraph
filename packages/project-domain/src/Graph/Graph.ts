import { Schema } from "effect";

import * as Node from "../Node/Node";

export const Id = Schema.Int.pipe(Schema.brand("Graph ID"));
export type Id = (typeof Id)["Type"];

export const Shape = Schema.Struct({
	id: Id,
	name: Schema.String,
	nodes: Schema.Array(Node.Shape).pipe(Schema.mutable),
	connections: Schema.Record({
		key: Schema.String,
		value: Schema.Record({
			key: Schema.String,
			value: Schema.Array(
				Schema.Tuple(Node.Id, Schema.String).pipe(Schema.mutable),
			).pipe(Schema.mutable),
		}).pipe(Schema.mutable),
	}).pipe(Schema.mutable),
}).pipe(Schema.mutable);

export type Shape = (typeof Shape)["Type"];

export class NotFound extends Schema.TaggedError<NotFound>()(
	"@macrograph/project-domain/Graph/NotFound",
	{ graphId: Id },
) {}
