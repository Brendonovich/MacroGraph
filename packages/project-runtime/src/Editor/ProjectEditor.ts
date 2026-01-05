import {
	Context,
	Effect,
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
} from "@macrograph/package-sdk/updated";
import type {
	Actor,
	Package,
	Project,
	ProjectEvent,
	Schema,
} from "@macrograph/project-domain";

export interface ProjectEditor {
	project: Effect.Effect<Project.Project>;
	modifyProject: (
		cb: (p: Project.Project) => Project.Project,
	) => Effect.Effect<void>;

	package: (id: Package.Id) => Effect.Effect<Option.Option<SDKPackage.Any>>;
	packages: Effect.Effect<Iterator<[Package.Id, SDKPackage.Any]>>;
	loadPackage: (id: Package.Id, pkg: SDKPackage.Any) => Effect.Effect<void>;

	getSchema: (ref: Schema.Ref) => Effect.Effect<Option.Option<SDKSchema.Any>>;

	publishEvent: <Event extends ProjectEvent.ProjectEvent>(
		event: Event,
	) => Effect.Effect<Event, never, Actor.Current>;
	subscribe: Effect.Effect<
		Stream.Stream<ProjectEvent.ProjectEvent & { actor: Actor.Actor }>,
		never,
		Scope.Scope
	>;
}

const tag = Context.GenericTag<ProjectEditor>("ProjectEditor");
export const ProjectEditor = tag;

export const make = (options: {
	project: Project.Project;
}): Effect.Effect<ProjectEditor> =>
	Effect.gen(function* () {
		const projectRef = yield* Ref.make(options.project);
		const packages = new Map<Package.Id, SDKPackage.Any>();
		const events = yield* PubSub.unbounded();

		return {
			project: projectRef,
			modifyProject: (v) => Ref.update(projectRef, v),

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
					yield* events.offer(e);
					return e;
				}),
			subscribe: Stream.fromPubSub(events, { scoped: true }),
		} as ProjectEditor;
	});

export const layer = (options: { project: Project.Project }) =>
	Layer.effect(ProjectEditor, make(options));
