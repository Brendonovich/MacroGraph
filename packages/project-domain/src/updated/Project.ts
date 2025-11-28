import * as S from "effect/Schema";

import * as Graph from "./Graph.ts";
import * as Node from "./Node.ts";

export class Project extends S.Class<Project>("Project")({
	name: S.String,
	graphs: S.HashMap({
		key: Graph.Id,
		value: S.suspend(() => Graph.Graph),
	}),
	nextGraphId: Graph.Id,
	nextNodeId: Node.Id,
}) {}
