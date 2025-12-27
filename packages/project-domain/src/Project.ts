import * as S from "effect/Schema";

import * as Graph from "./Graph.ts";
import * as Node from "./Node.ts";
import * as Package from "./Package.ts";

export class Project extends S.Class<Project>("Project")({
	name: S.String,
	graphs: S.HashMap({
		key: Graph.Id,
		value: S.suspend(() => Graph.Graph),
	}),
	constants: S.HashMap({
		key: S.String,
		value: S.Struct({
			name: S.String,
		}).pipe(
			S.extend(
				S.Union(
					S.Struct({
						type: S.Literal("resource"),
						pkg: Package.Id,
						resource: S.String,
						value: S.optional(S.String),
					}),
				),
			),
		),
	}),
	nextGraphId: Graph.Id,
	nextNodeId: Node.Id,
}) {}
