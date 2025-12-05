import { RpcSerialization } from "@effect/rpc";
import { Schema } from "effect";
import { Graph, Node } from "@macrograph/project-domain";

export type ServerEvent = Schema.Schema.Type<typeof ServerEvent>;
export const ServerEvent = Schema.Union(
	makeEvent("authChanged", {
		data: Schema.NullOr(
			Schema.Struct({ id: Schema.String, email: Schema.String }),
		),
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
