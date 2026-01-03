import { Schema } from "effect";
import { Graph, Node } from "@macrograph/project-domain";

export class ConnectedClientsChanged extends Schema.TaggedClass<ConnectedClientsChanged>()(
	"ConnectedClientsChanged",
	{ data: Schema.Int },
) {}

export class PresenceUpdated extends Schema.TaggedClass<PresenceUpdated>()(
	"PresenceUpdated",
	{
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
					Schema.Struct({ graph: Graph.Id, nodes: Schema.Array(Node.Id) }),
				),
			}),
		}),
	},
) {}

export type ServerEvent = Schema.Schema.Type<typeof ServerEvent>;
export const ServerEvent = Schema.Union(
	ConnectedClientsChanged,
	PresenceUpdated,
);
