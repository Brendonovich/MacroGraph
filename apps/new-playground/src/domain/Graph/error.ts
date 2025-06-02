import { Schema } from "effect";
import { GraphId } from "./data";

export class GraphNotFoundError extends Schema.TaggedError<GraphNotFoundError>(
  "GraphNotFoundError",
)("GraphNotFoundError", { graphId: GraphId }) {}
