import * as S from "effect/Schema";

import * as Credential from "./Credential.ts";
import * as Graph from "./Graph.ts";
import * as IO from "./IO.ts";
import * as Node from "./Node.ts";
import * as Package from "./Package.ts";
import * as Policy from "./Policy.ts";
import * as Project from "./Project.ts";
import * as ProjectEvent from "./ProjectEvent.ts";
import * as Schema from "./Schema.ts";
import { Position } from "./types.ts";

export class GetProject extends S.TaggedRequest<GetProject>()("GetProject", {
	payload: {},
	success: S.Struct({
		project: Project.Project,
		packages: S.Array(Package.Package),
		nodesIO: S.Map({ key: Node.Id, value: IO.NodeIO }),
	}),
	failure: Credential.FetchFailed,
}) {}

export class GetPackageEngineState extends S.TaggedRequest<GetPackageEngineState>()(
	"GetPackageEngineState",
	{
		payload: { package: Package.Id },
		success: S.Any,
		failure: S.Union(
			Package.NotFound,
			Credential.FetchFailed,
			Policy.PolicyDeniedError,
		),
	},
) {}

export class SetItemPositions extends S.TaggedRequest<SetItemPositions>()(
	"SetItemPositions",
	{
		payload: {
			graph: Graph.Id,
			items: S.Array(S.Tuple(Graph.ItemRef, Position)),
			// Position updates during dragging don't need to be persisted
			ephemeral: S.optional(S.Boolean),
		},
		success: S.Void,
		failure: Graph.NotFound,
	},
) {}

export class ConnectIO extends S.TaggedRequest<ConnectIO>()("ConnectIO", {
	payload: {
		graph: Graph.Id,
		output: S.Tuple(Node.Id, IO.Id),
		input: S.Tuple(Node.Id, IO.Id),
	},
	success: ProjectEvent.NodeIOUpdated,
	failure: S.Union(Graph.NotFound, Node.NotFound, IO.NotFound),
}) {}

export class DisconnectIO extends S.TaggedRequest<DisconnectIO>()(
	"DisconnectIO",
	{
		payload: {
			graph: Graph.Id,
			output: S.Struct({ node: Node.Id, io: IO.Id }),
			input: S.Struct({ node: Node.Id, io: IO.Id }),
		},
		success: S.UndefinedOr(ProjectEvent.NodeIOUpdated),
		failure: S.Union(Graph.NotFound, Node.NotFound),
	},
) {}

export class CreateNode extends S.TaggedRequest<CreateNode>()("CreateNode", {
	payload: {
		graph: Graph.Id,
		schema: Schema.Ref,
		name: S.optional(S.String),
		position: Position,
	},
	success: ProjectEvent.NodeCreated,
	failure: S.Union(Graph.NotFound, Package.NotFound, Schema.NotFound),
}) {}

export class CreateGraph extends S.TaggedRequest<CreateGraph>()("CreateGraph", {
	payload: { name: S.String },
	success: ProjectEvent.GraphCreated,
	failure: S.Never,
}) {}

export class DeleteGraphItems extends S.TaggedRequest<DeleteGraphItems>()(
	"DeleteGraphItems",
	{
		payload: { graph: Graph.Id, items: S.Array(Graph.ItemRef) },
		success: ProjectEvent.GraphItemsDeleted,
		failure: Graph.NotFound,
	},
) {}

export class SetNodeProperty extends S.TaggedRequest<SetNodeProperty>()(
	"SetNodeProperty",
	{
		payload: {
			graph: Graph.Id,
			node: Node.Id,
			property: S.String,
			value: S.Unknown,
		},
		success: ProjectEvent.NodePropertyUpdated,
		failure: S.Union(Graph.NotFound, Node.NotFound),
	},
) {}

export class SetInputDefault extends S.TaggedRequest<SetInputDefault>()(
	"SetInputDefault",
	{
		payload: { graph: Graph.Id, node: Node.Id, input: IO.Id, value: S.Unknown },
		success: ProjectEvent.InputDefaultUpdated,
		failure: S.Union(Graph.NotFound, Node.NotFound),
	},
) {}

export class CreateResourceConstant extends S.TaggedRequest<CreateResourceConstant>()(
	"CreateResourceConstant",
	{
		payload: { pkg: Package.Id, resource: S.String },
		success: ProjectEvent.ResourceConstantCreated,
		failure: S.Union(Package.NotFound),
	},
) {}

export class UpdateResourceConstant extends S.TaggedRequest<UpdateResourceConstant>()(
	"UpdateResourceConstant",
	{
		payload: {
			id: S.String,
			value: S.optional(S.String),
			name: S.optional(S.String),
		},
		success: ProjectEvent.ResourceConstantUpdated,
		failure: S.Union(Package.NotFound),
	},
) {}

export class DeleteResourceConstant extends S.TaggedRequest<DeleteResourceConstant>()(
	"DeleteResourceConstant",
	{
		payload: { id: S.String },
		success: ProjectEvent.ResourceConstantDeleted,
		failure: S.Never,
	},
) {}

export type Request =
	| GetProject
	| GetPackageEngineState
	| SetItemPositions
	| ConnectIO
	| DisconnectIO
	| CreateNode
	| CreateGraph
	| DeleteGraphItems
	| SetNodeProperty
	| SetInputDefault
	| CreateResourceConstant
	| UpdateResourceConstant
	| DeleteResourceConstant;
