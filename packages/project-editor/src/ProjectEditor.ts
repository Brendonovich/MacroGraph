import {
	Context,
	Effect,
	HashMap,
	Layer,
	Option,
	PubSub,
	Ref,
	type Scope,
	Stream,
} from "effect";
import type {
	Package as SDKPackage,
	Schema as SDKSchema,
} from "@macrograph/package-sdk";
import {
	Actor,
	type Graph,
	IO,
	type Node,
	NodesIOStore,
	type Package,
	Project,
	ProjectEvent,
	type Schema,
} from "@macrograph/project-domain";

export interface ProjectEditor {
	project: Effect.Effect<Project.Project>;
	modifyProject: (
		cb: (p: Project.Project) => Project.Project,
	) => Effect.Effect<void>;
	loadProject: (p: Project.Project) => Effect.Effect<void>;

	package: (id: Package.Id) => Effect.Effect<Option.Option<SDKPackage.Any>>;
	packages: Effect.Effect<Iterable<[Package.Id, SDKPackage.Any]>>;
	loadPackage: (id: Package.Id, pkg: SDKPackage.Any) => Effect.Effect<void>;

	getSchema: (ref: Schema.Ref) => Effect.Effect<Option.Option<SDKSchema.Any>>;

	publishEvent: <Event extends ProjectEvent.EditorEvent>(
		event: Event,
	) => Effect.Effect<Event, never, Actor.Current>;
	subscribe: Effect.Effect<
		Stream.Stream<ProjectEvent.EditorEvent & { actor: Actor.Actor }>,
		never,
		Scope.Scope
	>;

	generateNodeIO: (graph: Graph.Id, node: Node.Node) => Effect.Effect<void>;
}

const tag = Context.GenericTag<ProjectEditor>("ProjectEditor");
export const ProjectEditor = tag;

export const make = () =>
	Effect.gen(function* () {
		const projectRef = yield* Ref.make(Project.empty());
		const packages = new Map<Package.Id, SDKPackage.Any>();
		const events = yield* PubSub.unbounded<
			ProjectEvent.EditorEvent & { actor: Actor.Actor }
		>();

		const nodesIO = yield* NodesIOStore;

		const editor = {
			project: projectRef,
			modifyProject: (v) => Ref.update(projectRef, v),
			loadProject: (project) =>
				Effect.gen(function* () {
					for (const graph of HashMap.values(project.graphs)) {
						for (const node of HashMap.values(graph.nodes)) {
							const schema = yield* editor.getSchema(node.schema);
							if (Option.isNone(schema)) continue;

							const io = yield* IO.generateNodeIO(schema.value, node);
							yield* nodesIO.setForNode(node.id, io);
						}
					}

					yield* Ref.set(projectRef, project);
				}),
			package: (id) => Effect.sync(() => Option.fromNullable(packages.get(id))),
			packages: Effect.sync(() => packages.entries()),
			loadPackage: (id, pkg) =>
				Effect.sync(() => {
					packages.set(id, pkg);
				}),

			getSchema: ({ pkg, id }) =>
				Effect.succeed(Option.fromNullable(packages.get(pkg)?.schemas.get(id))),

			publishEvent: (e) =>
				Effect.gen(function* () {
					yield* events.offer({ ...e, actor: yield* Actor.Current });
					return e;
				}),
			subscribe: Stream.fromPubSub(events, { scoped: true }),

			generateNodeIO: (graph: Graph.Id, node: Node.Node) =>
				Effect.gen(function* () {
					const schema = yield* editor.getSchema(node.schema);
					if (Option.isNone(schema)) return;

					const io = yield* IO.generateNodeIO(schema.value, node);
					yield* nodesIO.setForNode(node.id, io);

					yield* editor.publishEvent(
						new ProjectEvent.NodeIOUpdated({
							graph,
							node: node.id,
							io: {
								inputs: io.inputs.map((i) => i[0]),
								outputs: io.outputs.map((o) => o[0]),
							},
						}),
					);
				}).pipe(
					Effect.provideService(Actor.Current, { type: "SYSTEM" }),
					Effect.fork,
				),
		} as ProjectEditor;

		return editor;
	});

export const layer = () => Layer.effect(ProjectEditor, make());
