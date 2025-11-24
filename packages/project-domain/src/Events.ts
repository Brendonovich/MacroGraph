import { Schema } from "effect";

import * as Graph from "./Graph";
import * as Node from "./Node";
import { Position, SchemaRef } from "./types";

export type ProjectEvent = NodeCreated | NodesMoved;

export class NodeCreated extends Schema.TaggedClass<NodeCreated>()(
	"NodeCreated",
	{
		graphId: Graph.Id,
		nodeId: Node.Id,
		schema: SchemaRef,
		position: Position,
		io: Node.IO,
	},
) {}

export class NodesMoved extends Schema.TaggedClass<NodesMoved>()("NodesMoved", {
	graphId: Graph.Id,
	positions: Schema.Array(Schema.Tuple(Node.Id, Position)),
}) {}
