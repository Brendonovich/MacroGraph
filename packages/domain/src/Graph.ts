import { Schema } from "effect";

export const Id = Schema.Int.pipe(Schema.brand("Graph ID"));
export type Id = (typeof Id)["Type"];

export class NotFound extends Schema.TaggedError<NotFound>()(
  "@macrograph/domain/Graph/NotFound",
  { graphId: Id },
) {}
