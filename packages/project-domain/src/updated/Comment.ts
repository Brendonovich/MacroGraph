import * as S from "effect/Schema";

import { Position } from "../types";

export const Id = S.Int.pipe(S.brand("Comment.Id"));
export type Id = S.Schema.Type<typeof Id>;

export class Comment extends S.Class<Comment>("Comment")({
	id: Id,
	text: S.String,
	color: S.String,
	position: Position,
}) {}
