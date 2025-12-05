import * as S from "effect/Schema";

import { Position } from "../types";
import * as Graph from "./Graph";
import * as IO from "./IO";
import * as Node from "./Node";
import * as Package from "./Package";
import * as Resource from "./Resource";

export class NodeCreated extends S.TaggedClass<NodeCreated>()("NodeCreated", {
	graph: Graph.Id,
	node: Node.Node,
	io: IO.NodeIO,
}) {}

export class GraphCreated extends S.TaggedClass<GraphCreated>()(
	"GraphCreated",
	{ graph: Graph.Graph },
) {}

export class IOUpdated extends S.TaggedClass<IOUpdated>()("IOUpdated", {
	io: S.optional(
		S.HashMap({
			key: Node.Id,
			value: S.Struct({
				inputs: S.Array(IO.InputPort),
				outputs: S.Array(IO.OutputPort),
			}),
		}),
	),
	outConnections: S.optional(
		S.HashMap({
			key: Node.Id,
			value: Graph.NodeOutputConnections,
		}),
	),
}) {}

export class PackageAdded extends S.TaggedClass<PackageAdded>()(
	"PackageAdded",
	{ pkg: Package.Package },
) {}

export class PackageStateChanged extends S.TaggedClass<PackageStateChanged>()(
	"PackageStateChanged",
	{ pkg: Package.Id },
) {}

export class GraphItemsMoved extends S.TaggedClass<GraphItemsMoved>()(
	"GraphItemsMoved",
	{
		graph: Graph.Id,
		items: S.Array(S.Tuple(Graph.ItemRef, Position)),
	},
) {}

export class GraphItemsDeleted extends S.TaggedClass<GraphItemsDeleted>()(
	"GraphItemsDeleted",
	{
		graph: Graph.Id,
		items: S.Array(Graph.ItemRef),
	},
) {}

export class NodePropertyUpdated extends S.TaggedClass<NodePropertyUpdated>()(
	"NodePropertyUpdated",
	{
		graph: Graph.Id,
		node: Node.Id,
		property: S.String,
		value: S.String,
	},
) {}

export class PackageResourcesUpdated extends S.TaggedClass<PackageResourcesUpdated>()(
	"PackageResourcesUpdated",
	{
		package: Package.Id,
		resources: S.Record({
			key: S.String,
			value: S.Array(Resource.ResourceValue).pipe(S.mutable),
		}).pipe(S.mutable),
	},
) {}

export const ProjectEvent = S.Union(
	PackageAdded,
	PackageStateChanged,
	PackageResourcesUpdated,
	GraphCreated,
	GraphItemsMoved,
	GraphItemsDeleted,
	NodeCreated,
	NodePropertyUpdated,
	IOUpdated,
);
export type ProjectEvent = typeof ProjectEvent.Type;
