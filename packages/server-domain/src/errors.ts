import { Data, Schema } from "effect";

export class IONotFound extends Schema.TaggedError<IONotFound>()("IONotFound", {
  type: Schema.Union(Schema.Literal("in"), Schema.Literal("out")),
  nodeId: Schema.Int,
}) {}
