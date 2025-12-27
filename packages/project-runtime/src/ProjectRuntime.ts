import type { Option } from "effect";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as PubSub from "effect/PubSub";
import * as Ref from "effect/Ref";
import type { PackageEngine } from "@macrograph/package-sdk";
import type { NodeSchema, Resource } from "@macrograph/project-domain";
import {
	Actor,
	type Credential,
	type Resource as DResource,
	Graph,
	type IO,
	Node,
	type Package,
	Project,
	type ProjectEvent,
	type Schema,
} from "@macrograph/project-domain";

export interface NodeIO {
	readonly shape: unknown;
	readonly inputs: Array<IO.InputPort>;
	readonly outputs: Array<IO.OutputPort>;
}

export class ProjectRuntime extends Data.Class<{
	readonly projectRef: Ref.Ref<Project.Project>;
	readonly events: PubSub.PubSub<
		ProjectEvent.ProjectEvent & { actor: Actor.Actor }
	>;
	readonly nodesIORef: Ref.Ref<HashMap.HashMap<Node.Id, NodeIO>>;
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
	def: PackageEngine.PackageEngineDefinition<
		any,
		any,
		any,
		Resource.Resource<string, any>
	>;
	readonly getResourceValues: (
		id: string,
	) => Effect.Effect<
		Option.Option<Array<DResource.ResourceValue>>,
		Credential.FetchFailed
	>;
	readonly updateResources: Effect.Effect<void, Credential.FetchFailed>;
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
	constants: HashMap.empty(),
});

export const make = () =>
	Effect.gen(function* () {
		return new ProjectRuntime({
			projectRef: yield* Ref.make(defaultProject),
			nodesIORef: yield* Ref.make(HashMap.empty<Node.Id, NodeIO>()),
			events: (yield* PubSub.unbounded()) as any,
			packages: new Map(),
		});
	});

export const publishEvent = (event: ProjectEvent.ProjectEvent) =>
	Effect.gen(function* () {
		const runtime = yield* Current;
		const actor = yield* Actor.Current;
		yield* runtime.events.publish({ ...event, actor });
	});
