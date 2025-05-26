import { Effect, Schema } from "effect";

import { Node } from "../Node/data";

export const GraphId = Schema.Int.pipe(Schema.brand("Graph ID"));
export type GraphId = (typeof GraphId)["Type"];

export const Graph = Schema.Struct({
  id: GraphId,
  name: Schema.String,
  nodes: Schema.Array(Node),
});
export type Graph = (typeof Graph)["Type"];
