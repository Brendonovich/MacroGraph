import * as S from "effect/Schema";

import { Position } from "../types.ts";
import * as Schema from "./Schema.ts";

export const Id = S.Int.pipe(S.brand("Node.Id"));
export type Id = S.Schema.Type<typeof Id>;

export const Node = S.Struct({
	id: Id,
	name: S.String,
	schema: S.suspend(() => Schema.Ref),
	properties: S.optional(
		S.HashMap({
			key: S.String,
			value: S.Unknown,
		}),
	),
	position: Position,
});
export type Node = S.Schema.Type<typeof Node>;

export class NotFound extends S.TaggedError<NotFound>()("Node/NotFound", {
	id: Id,
}) {}

export class NotExecutable extends S.TaggedError<NotExecutable>()(
	"Node/NotExecutable",
	{},
) {}
