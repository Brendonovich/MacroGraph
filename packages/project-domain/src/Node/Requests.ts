import { Schema } from "effect";

import { Id, NotFound } from "./Node";
import { Position } from "../types";
import * as Graph from "../Graph/Graph";
import { PolicyDeniedError } from "../Policy";

export class SetNodePositions extends Schema.TaggedRequest<SetNodePositions>()(
	"SetNodePositions",
	{
		payload: {
			graphId: Graph.Id,
			positions: Schema.Array(Schema.Tuple(Id, Position)),
		},
		success: Schema.Void,
		failure: Schema.Union(Graph.NotFound, NotFound, PolicyDeniedError),
	},
) {}
