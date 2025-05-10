import { Data, Schema } from "effect";

export class NotComputationNode extends Data.TaggedError(
  "NotComputationNode",
) {}

export class NotEventNode extends Data.TaggedError("NotEventNode") {}

export class SchemaNotFound extends Schema.TaggedError<SchemaNotFound>()(
  "SchemaNotFound",
  {
    pkgId: Schema.String,
    schemaId: Schema.String,
  },
) {}

export class NodeNotFound extends Schema.TaggedError<NodeNotFound>()(
  "NodeNotFound",
  {
    nodeId: Schema.Int,
  },
) {}

export class IONotFound extends Schema.TaggedError<IONotFound>()("IONotFound", {
  type: Schema.Union(Schema.Literal("in"), Schema.Literal("out")),
  nodeId: Schema.Int,
}) {}
