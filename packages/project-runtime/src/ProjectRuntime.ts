import type { Option } from "effect";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as PubSub from "effect/PubSub";
import * as Ref from "effect/Ref";
import type { PackageEngine } from "@macrograph/package-sdk";
import type { NodeSchema } from "@macrograph/project-domain";
import {
	Graph,
	type IO,
	Node,
	type Package,
	Project,
	type ProjectEvent,
	type Schema,
} from "@macrograph/project-domain/updated";

export class ProjectRuntime extends Data.Class<{
	readonly projectRef: Ref.Ref<Project.Project>;
	readonly events: PubSub.PubSub<ProjectEvent.ProjectEvent>;
	readonly nodesIORef: Ref.Ref<HashMap.HashMap<Node.Id, IO.NodeIO>>;
	readonly packages: Map<Package.Id, RuntimePackage>;
}> {}

export interface RuntimePackage {
	id: Package.Id;
	name: string;
	schemas: Map<Schema.Id, NodeSchema>;
	engine: Option.Option<RuntimePackageEngine>;
}

export interface RuntimePackageEngine
	extends PackageEngine.BuiltEngine<any, any, any> {
	events: PubSub.PubSub<any>;
	def: PackageEngine.PackageEngineDefinition<any, any, any, any>;
}

// @effect-leakable-service
export class Current extends Context.Tag("ProjectRuntime/Current")<
	Current,
	ProjectRuntime
>() {}

const defaultProject = new Project.Project({
	name: "Untitled Project",
	nextGraphId: Graph.Id.make(0),
	nextNodeId: Node.Id.make(0),
	graphs: HashMap.empty(),
});

export const make = () =>
	Effect.gen(function* () {
		return new ProjectRuntime({
			projectRef: yield* Ref.make(defaultProject),
			nodesIORef: yield* Ref.make(HashMap.empty<Node.Id, IO.NodeIO>()),
			events: yield* PubSub.unbounded<ProjectEvent.ProjectEvent>(),
			packages: new Map(),
		});
	});
