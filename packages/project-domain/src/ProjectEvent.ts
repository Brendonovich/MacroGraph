import * as S from "effect/Schema";

import * as Graph from "./Graph";
import * as IO from "./IO";
import * as Node from "./Node";
import { Resource } from "./NodeSchema";
import * as Package from "./Package";
import { Position } from "./types";

export class NodeCreated extends S.TaggedClass<NodeCreated>()("NodeCreated", {
	graph: Graph.Id,
	node: Node.Node,
	io: IO.NodeIO,
}) {}

export class GraphCreated extends S.TaggedClass<GraphCreated>()(
	"GraphCreated",
	{ graph: Graph.Graph },
) {}

export class NodeIOUpdated extends S.TaggedClass<NodeIOUpdated>()(
	"NodeIOUpdated",
	{
		graph: Graph.Id,
		node: Node.Id,
		io: S.optional(
			S.Struct({
				inputs: S.Array(IO.InputPort),
				outputs: S.Array(IO.OutputPort),
			}),
		),
		outConnections: S.optional(Graph.NodeOutputConnections),
	},
) {}

export class PackageAdded extends S.TaggedClass<PackageAdded>()(
	"PackageAdded",
	{ pkg: Package.Package },
) {}

export class GraphItemsMoved extends S.TaggedClass<GraphItemsMoved>()(
	"GraphItemsMoved",
	{ graph: Graph.Id, items: S.Array(S.Tuple(Graph.ItemRef, Position)) },
) {}

export class GraphItemsDeleted extends S.TaggedClass<GraphItemsDeleted>()(
	"GraphItemsDeleted",
	{ graph: Graph.Id, items: S.Array(Graph.ItemRef) },
) {}

export class NodePropertyUpdated extends S.TaggedClass<NodePropertyUpdated>()(
	"NodePropertyUpdated",
	{ graph: Graph.Id, node: Node.Id, property: S.String, value: S.Unknown },
) {}

export class InputDefaultUpdated extends S.TaggedClass<InputDefaultUpdated>()(
	"InputDefaultUpdated",
	{ graph: Graph.Id, node: Node.Id, input: IO.Id, value: S.Unknown },
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

export class ResourceConstantCreated extends S.TaggedClass<ResourceConstantCreated>()(
	"ResourceConstantCreated",
	{
		pkg: Package.Id,
		resource: S.String,
		id: S.String,
		name: S.String,
		value: S.Option(S.String),
	},
) {}

export class ResourceConstantUpdated extends S.TaggedClass<ResourceConstantUpdated>()(
	"ResourceConstantUpdated",
	{ id: S.String, value: S.optional(S.String), name: S.optional(S.String) },
) {}

export class ResourceConstantDeleted extends S.TaggedClass<ResourceConstantDeleted>()(
	"ResourceConstantDeleted",
	{ id: S.String },
) {}

export const EditorEvent = S.Union(
	PackageAdded,
	GraphCreated,
	GraphItemsMoved,
	GraphItemsDeleted,
	NodeCreated,
	NodePropertyUpdated,
	InputDefaultUpdated,
	NodeIOUpdated,
	ResourceConstantCreated,
	ResourceConstantUpdated,
	ResourceConstantDeleted,
);
export type EditorEvent = typeof EditorEvent.Type;

export class PackageStateChanged extends S.TaggedClass<PackageStateChanged>()(
	"PackageStateChanged",
	{ pkg: Package.Id },
) {}

export const RuntimeEvent = S.Union(
	PackageStateChanged,
	PackageResourcesUpdated,
);
export type RuntimeEvent = typeof RuntimeEvent.Type;

export const ProjectEvent = S.Union(EditorEvent, RuntimeEvent);
export type ProjectEvent = typeof ProjectEvent.Type;
