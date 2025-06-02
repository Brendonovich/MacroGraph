import { Schema } from "effect";

import { Node, NodeId } from "../Node/data";

export const GraphId = Schema.Int.pipe(Schema.brand("Graph ID"));
export type GraphId = (typeof GraphId)["Type"];

export const Graph = Schema.Struct({
  id: GraphId,
  name: Schema.String,
  nodes: Schema.Array(Node),
  connections: Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(Schema.Tuple(NodeId, Schema.String)),
    }),
  }),
});
export type Graph = (typeof Graph)["Type"];
