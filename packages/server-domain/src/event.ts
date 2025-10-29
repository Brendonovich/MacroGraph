import { Schema } from "effect";

import { RpcSerialization } from "@effect/rpc";
import { Position, SchemaRef } from "./util";
import { Graph, Node } from "@macrograph/project-domain";

export type ProjectEvent = Schema.Schema.Type<typeof ProjectEvent>;
export const ProjectEvent = Schema.Union(
	makeEvent("authChanged", {
		data: Schema.NullOr(
			Schema.Struct({ id: Schema.String, email: Schema.String }),
		),
	}),
	makeEvent("packageAdded", {
		data: Schema.Struct({
			package: Schema.String,
		}),
	}),
	makeEvent("packageStateChanged", {
		package: Schema.String,
	}),
	makeEvent("connectedClientsChanged", {
		data: Schema.Int,
	}),
	makeEvent("PresenceUpdated", {
		data: Schema.Record({
			key: Schema.String,
			value: Schema.Struct({
				name: Schema.String,
				colour: Schema.String,
				mouse: Schema.optional(
					Schema.Struct({
						graph: Graph.Id,
						x: Schema.Number,
						y: Schema.Number,
					}),
				),
				selection: Schema.optional(
					Schema.Struct({
						graph: Graph.Id,
						nodes: Schema.Array(Node.Id),
					}),
				),
			}),
		}),
	}),
	makeEvent("NodeMoved", {
		graphId: Graph.Id,
		nodeId: Node.Id,
		position: Position,
	}),
	makeEvent("NodesMoved", {
		graphId: Graph.Id,
		positions: Schema.Array(Schema.Tuple(Node.Id, Position)),
	}),
	makeEvent("NodeCreated", {
		name: Schema.optional(Schema.String),
		graphId: Graph.Id,
		nodeId: Node.Id,
		schema: SchemaRef,
		position: Position,
	}).pipe(Schema.extend(Node.IO)),
	makeEvent("IOConnected", {
		graphId: Graph.Id,
		output: Node.IORef,
		input: Node.IORef,
	}),
	makeEvent("IODisconnected", {
		graphId: Graph.Id,
		io: Schema.extend(
			Node.IORef,
			Schema.Struct({ type: Schema.Literal("i", "o") }),
		),
	}),
	makeEvent("SelectionDeleted", {
		graphId: Graph.Id,
		selection: Schema.Array(Node.Id),
	}),
);

function makeEvent<S extends string, F extends Schema.Struct.Fields>(
	type: S,
	fields: F,
) {
	return Schema.Struct({
		...fields,
		type: Schema.Literal(type),
	});
}

export const RpcsSerialization = RpcSerialization.layerJson;
