import * as S from "effect/Schema";

import * as Comment from "./Comment.ts";
import * as IO from "./IO.ts";
import * as Node from "./Node.ts";

export const Id = S.Int.pipe(S.brand("Graph.Id"));
export type Id = S.Schema.Type<typeof Id>;

export const NodeOutputConnections = S.Record({
	key: IO.Id,
	value: S.Array(S.Tuple(Node.Id, IO.Id)),
});
export type NodeOutputConnections = S.Schema.Type<typeof NodeOutputConnections>;

export class Graph extends S.Class<Graph>("Graph")({
	id: Id,
	name: S.String,
	nodes: S.HashMap({ key: Node.Id, value: S.suspend(() => Node.Node) }),
	connections: S.HashMap({
		key: Node.Id,
		value: NodeOutputConnections,
	}),
	comments: S.HashMap({
		key: Comment.Id,
		value: S.suspend(() => Comment.Comment),
	}),
}) {}

export class NotFound extends S.TaggedError<NotFound>()("Graph.NotFound", {
	id: Id,
}) {}

export const ItemRef = S.Union(
	S.Tuple(S.Literal("Node"), Node.Id),
	S.Tuple(S.Literal("Comment"), Comment.Id),
);
export type ItemRef = S.Schema.Type<typeof ItemRef>;
