import { Schema } from "effect";

import * as Node from "../Node";
import * as Graph from "./Graph";
import { PolicyDeniedError } from "../Policy";
import { SchemaRef } from "../types";
import { SchemaNotFound } from "../runtime";
import { NodeCreated } from "../Events";

export class CreateNode extends Schema.TaggedRequest<CreateNode>()(
	"CreateNode",
	{
		payload: {
			schema: SchemaRef,
			graphId: Graph.Id,
			position: Schema.Tuple(Schema.Number, Schema.Number),
		},
		success: NodeCreated,
		failure: Schema.Union(Graph.NotFound, SchemaNotFound, PolicyDeniedError),
	},
) {}

export class ConnectIO extends Schema.TaggedRequest<ConnectIO>()("ConnectIO", {
	payload: {
		graphId: Graph.Id,
		output: Node.IORef,
		input: Node.IORef,
	},
	success: Schema.Void,
	failure: Schema.Union(Graph.NotFound, Node.NotFound, PolicyDeniedError),
}) {}

export class DisconnectIO extends Schema.TaggedRequest<DisconnectIO>()(
	"DisconnectIO",
	{
		payload: {
			graphId: Graph.Id,
			io: Schema.extend(
				Node.IORef,
				Schema.Struct({ type: Schema.Literal("i", "o") }),
			),
		},
		success: Schema.Void,
		failure: Schema.Union(Graph.NotFound, Node.NotFound, PolicyDeniedError),
	},
) {}

export class DeleteSelection extends Schema.TaggedRequest<DeleteSelection>()(
	"DeleteSelection",
	{
		payload: {
			graph: Graph.Id,
			selection: Schema.Array(Node.Id).pipe(Schema.mutable),
		},
		success: Schema.Void,
		failure: Schema.Union(Graph.NotFound, Node.NotFound, PolicyDeniedError),
	},
) {}
