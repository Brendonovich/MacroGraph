import { Context, Schema } from "effect";
import { Graph, IOId, Node } from "@macrograph/project-domain";

export type NodeConnections = {
	in?: Map<string, Array<[Node.Id, string]>>;
	out?: Map<string, Array<[Node.Id, string]>>;
};

export const ProjectShape = Schema.Struct({
	name: Schema.String,
	nodeIdCounter: Schema.Int,
	graphs: Schema.Map({
		key: Graph.Id,
		value: Schema.Struct({
			id: Graph.Id,
			name: Schema.String,
			nodes: Schema.Array(Node.Shape).pipe(Schema.mutable),
			connections: Schema.optional(
				Schema.Map({
					key: Node.Id,
					value: Schema.Struct({
						in: Schema.Map({
							key: IOId,
							value: Schema.Array(
								Schema.Tuple(Node.Id, IOId).pipe(Schema.mutable),
							).pipe(Schema.mutable),
						}),
						out: Schema.Map({
							key: IOId,
							value: Schema.Array(
								Schema.Tuple(Node.Id, IOId).pipe(Schema.mutable),
							).pipe(Schema.mutable),
						}),
					}).pipe(Schema.mutable),
				}),
			),
		}).pipe(Schema.mutable),
	}),
}).pipe(Schema.mutable);

export type ProjectShape = Schema.Schema.Type<typeof ProjectShape>;

export class ProjectData extends Context.Tag("ProjectData")<
	ProjectData,
	ProjectShape
>() {}
