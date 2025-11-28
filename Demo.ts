import {
	Effect,
	Context,
	Layer,
	Ref,
	HashMap,
	Queue,
	Stream,
	pipe,
} from "effect";
import * as Http from "@effect/platform/HttpServer";
import { Schema } from "@effect/schema";

// ============================================================================
// Domain Models - Pure Data
// ============================================================================

type ProjectId = string & { readonly _tag: "ProjectId" };

interface Project {
	readonly id: ProjectId;
	readonly name: string;
	readonly canvas: Canvas;
	readonly lastModified: Date;
}

interface Canvas {
	readonly elements: ReadonlyArray<CanvasElement>;
	readonly backgroundColor: string;
}

interface CanvasElement {
	readonly id: string;
	readonly type: "rectangle" | "circle" | "text";
	readonly x: number;
	readonly y: number;
	readonly properties: Record<string, unknown>;
}

// ============================================================================
// Domain Events
// ============================================================================

type ProjectEvent =
	| {
			readonly _tag: "ProjectCreated";
			readonly project: Project;
			readonly timestamp: Date;
	  }
	| {
			readonly _tag: "ProjectDeleted";
			readonly projectId: ProjectId;
			readonly timestamp: Date;
	  }
	| {
			readonly _tag: "ProjectRenamed";
			readonly projectId: ProjectId;
			readonly oldName: string;
			readonly newName: string;
			readonly timestamp: Date;
	  }
	| {
			readonly _tag: "ElementAdded";
			readonly projectId: ProjectId;
			readonly element: CanvasElement;
			readonly timestamp: Date;
	  }
	| {
			readonly _tag: "ElementUpdated";
			readonly projectId: ProjectId;
			readonly elementId: string;
			readonly timestamp: Date;
	  }
	| {
			readonly _tag: "ElementDeleted";
			readonly projectId: ProjectId;
			readonly elementId: string;
			readonly timestamp: Date;
	  }
	| {
			readonly _tag: "CanvasUpdated";
			readonly projectId: ProjectId;
			readonly timestamp: Date;
	  };

// ============================================================================
// Errors
// ============================================================================

class ProjectNotFoundError {
	readonly _tag = "ProjectNotFoundError";
	constructor(readonly projectId: ProjectId) {}
}

// ============================================================================
// Event Stream
// ============================================================================

interface EventStream {
	readonly publish: (event: ProjectEvent) => Effect.Effect<void>;
	readonly subscribe: () => Stream.Stream<ProjectEvent>;
}

const EventStream = Context.GenericTag<EventStream>("EventStream");

const makeEventStream = Effect.gen(function* () {
	const queue = yield* Queue.unbounded<ProjectEvent>();

	return EventStream.of({
		publish: (event) => Queue.offer(queue, event),
		subscribe: () => Stream.fromQueue(queue),
	});
});

const EventStreamLive = Layer.effect(EventStream, makeEventStream);

// ============================================================================
// Project Provider - Abstract way to get/set the current project
// ============================================================================

interface ProjectProvider {
	readonly getCurrent: () => Effect.Effect<Project, ProjectNotFoundError>;
	readonly setCurrent: (project: Project) => Effect.Effect<void>;
}

const ProjectProvider = Context.GenericTag<ProjectProvider>("ProjectProvider");

// ============================================================================
// Project Service - Works on "current" project only
// ============================================================================

// This service never takes ProjectId - it always operates on the "current" project
interface ProjectService {
	readonly get: () => Effect.Effect<
		Project,
		ProjectNotFoundError,
		ProjectProvider | EventStream
	>;
	readonly addElement: (
		element: CanvasElement,
	) => Effect.Effect<
		Project,
		ProjectNotFoundError,
		ProjectProvider | EventStream
	>;
	readonly updateElement: (
		elementId: string,
		fn: (element: CanvasElement) => CanvasElement,
	) => Effect.Effect<
		Project,
		ProjectNotFoundError,
		ProjectProvider | EventStream
	>;
	readonly deleteElement: (
		elementId: string,
	) => Effect.Effect<
		Project,
		ProjectNotFoundError,
		ProjectProvider | EventStream
	>;
	readonly updateCanvas: (
		fn: (canvas: Canvas) => Canvas,
	) => Effect.Effect<
		Project,
		ProjectNotFoundError,
		ProjectProvider | EventStream
	>;
	readonly rename: (
		newName: string,
	) => Effect.Effect<
		Project,
		ProjectNotFoundError,
		ProjectProvider | EventStream
	>;
}

const ProjectService = Context.GenericTag<ProjectService>("ProjectService");

const makeProjectService = Effect.succeed(
	ProjectService.of({
		get: () =>
			Effect.gen(function* () {
				const provider = yield* ProjectProvider;
				return yield* provider.getCurrent();
			}),

		addElement: (element) =>
			Effect.gen(function* () {
				const provider = yield* ProjectProvider;
				const events = yield* EventStream;

				const project = yield* provider.getCurrent();
				const updated = {
					...project,
					canvas: {
						...project.canvas,
						elements: [...project.canvas.elements, element],
					},
					lastModified: new Date(),
				};
				yield* provider.setCurrent(updated);
				yield* events.publish({
					_tag: "ElementAdded",
					projectId: updated.id,
					element,
					timestamp: new Date(),
				});
				return updated;
			}),

		updateElement: (elementId, fn) =>
			Effect.gen(function* () {
				const provider = yield* ProjectProvider;
				const events = yield* EventStream;

				const project = yield* provider.getCurrent();
				const updated = {
					...project,
					canvas: {
						...project.canvas,
						elements: project.canvas.elements.map((el) =>
							el.id === elementId ? fn(el) : el,
						),
					},
					lastModified: new Date(),
				};
				yield* provider.setCurrent(updated);
				yield* events.publish({
					_tag: "ElementUpdated",
					projectId: updated.id,
					elementId,
					timestamp: new Date(),
				});
				return updated;
			}),

		deleteElement: (elementId) =>
			Effect.gen(function* () {
				const provider = yield* ProjectProvider;
				const events = yield* EventStream;

				const project = yield* provider.getCurrent();
				const updated = {
					...project,
					canvas: {
						...project.canvas,
						elements: project.canvas.elements.filter(
							(el) => el.id !== elementId,
						),
					},
					lastModified: new Date(),
				};
				yield* provider.setCurrent(updated);
				yield* events.publish({
					_tag: "ElementDeleted",
					projectId: updated.id,
					elementId,
					timestamp: new Date(),
				});
				return updated;
			}),

		updateCanvas: (fn) =>
			Effect.gen(function* () {
				const provider = yield* ProjectProvider;
				const events = yield* EventStream;

				const project = yield* provider.getCurrent();
				const updated = {
					...project,
					canvas: fn(project.canvas),
					lastModified: new Date(),
				};
				yield* provider.setCurrent(updated);
				yield* events.publish({
					_tag: "CanvasUpdated",
					projectId: updated.id,
					timestamp: new Date(),
				});
				return updated;
			}),

		rename: (newName) =>
			Effect.gen(function* () {
				const provider = yield* ProjectProvider;
				const events = yield* EventStream;

				const oldProject = yield* provider.getCurrent();
				const updated = {
					...oldProject,
					name: newName,
					lastModified: new Date(),
				};
				yield* provider.setCurrent(updated);
				yield* events.publish({
					_tag: "ProjectRenamed",
					projectId: updated.id,
					oldName: oldProject.name,
					newName,
					timestamp: new Date(),
				});
				return updated;
			}),
	}),
);

const ProjectServiceLive = Layer.effect(ProjectService, makeProjectService);

// ============================================================================
// Single Project Provider - For playground environments
// ============================================================================

const SingleProjectRef =
	Context.GenericTag<Ref.Ref<Project>>("SingleProjectRef");

const makeSingleProjectRef = Ref.make<Project>({
	id: crypto.randomUUID() as ProjectId,
	name: "Untitled Project",
	canvas: { elements: [], backgroundColor: "#ffffff" },
	lastModified: new Date(),
});

const SingleProjectRefLive = Layer.effect(
	SingleProjectRef,
	makeSingleProjectRef,
);

const makeSingleProjectProvider = Effect.gen(function* () {
	const projectRef = yield* SingleProjectRef;

	return ProjectProvider.of({
		getCurrent: () => Ref.get(projectRef),
		setCurrent: (project) => Ref.set(projectRef, project),
	});
});

const SingleProjectProviderLive = Layer.effect(
	ProjectProvider,
	makeSingleProjectProvider,
).pipe(Layer.provide(SingleProjectRefLive));

// ============================================================================
// Playground Operations - Single-project specific operations
// ============================================================================

interface PlaygroundOps {
	readonly reset: () => Effect.Effect<Project>;
}

const PlaygroundOps = Context.GenericTag<PlaygroundOps>("PlaygroundOps");

const makePlaygroundOps = Effect.gen(function* () {
	const projectRef = yield* SingleProjectRef;
	const events = yield* EventStream;

	return PlaygroundOps.of({
		reset: () =>
			Effect.gen(function* () {
				const newProject: Project = {
					id: crypto.randomUUID() as ProjectId,
					name: "Untitled Project",
					canvas: { elements: [], backgroundColor: "#ffffff" },
					lastModified: new Date(),
				};
				yield* Ref.set(projectRef, newProject);
				yield* events.publish({
					_tag: "ProjectCreated",
					project: newProject,
					timestamp: new Date(),
				});
				return newProject;
			}),
	});
});

const PlaygroundOpsLive = Layer.effect(PlaygroundOps, makePlaygroundOps).pipe(
	Layer.provide(Layer.mergeAll(SingleProjectRefLive, EventStreamLive)),
);

// ============================================================================
// Multi Project Provider - Uses CurrentProjectId from context
// ============================================================================

const CurrentProjectId = Context.GenericTag<ProjectId>("CurrentProjectId");

const makeMultiProjectProvider = Effect.gen(function* () {
	const projectsRef = yield* Ref.make(HashMap.empty<ProjectId, Project>());

	return ProjectProvider.of({
		getCurrent: () =>
			Effect.gen(function* () {
				const id = yield* CurrentProjectId;
				const projects = yield* Ref.get(projectsRef);
				return yield* pipe(
					HashMap.get(projects, id),
					Effect.mapError(() => new ProjectNotFoundError(id)),
				);
			}),

		setCurrent: (project) =>
			Ref.update(projectsRef, (projects) =>
				HashMap.set(projects, project.id, project),
			),
	});
});

const MultiProjectProviderLive = Layer.effect(
	ProjectProvider,
	makeMultiProjectProvider,
);

// ============================================================================
// Project Registry - Multi-project coordination (create, list, delete, etc.)
// ============================================================================

interface ProjectRegistry {
	readonly create: (name: string) => Effect.Effect<Project>;
	readonly list: () => Effect.Effect<ReadonlyArray<Project>>;
	readonly delete: (id: ProjectId) => Effect.Effect<void, ProjectNotFoundError>;
}

const ProjectRegistry = Context.GenericTag<ProjectRegistry>("ProjectRegistry");

const makeProjectRegistry = Effect.gen(function* () {
	const projectsRef = yield* Ref.make(HashMap.empty<ProjectId, Project>());
	const events = yield* EventStream;

	return ProjectRegistry.of({
		create: (name) =>
			Effect.gen(function* () {
				const project: Project = {
					id: crypto.randomUUID() as ProjectId,
					name,
					canvas: { elements: [], backgroundColor: "#ffffff" },
					lastModified: new Date(),
				};
				yield* Ref.update(projectsRef, (projects) =>
					HashMap.set(projects, project.id, project),
				);
				yield* events.publish({
					_tag: "ProjectCreated",
					project,
					timestamp: new Date(),
				});
				return project;
			}),

		list: () =>
			pipe(
				Ref.get(projectsRef),
				Effect.map((projects) => Array.from(HashMap.values(projects))),
			),

		delete: (id) =>
			Effect.gen(function* () {
				const projects = yield* Ref.get(projectsRef);
				if (!HashMap.has(projects, id)) {
					return yield* Effect.fail(new ProjectNotFoundError(id));
				}
				yield* Ref.update(projectsRef, (projects) =>
					HashMap.remove(projects, id),
				);
				yield* events.publish({
					_tag: "ProjectDeleted",
					projectId: id,
					timestamp: new Date(),
				});
			}),
	});
});

const ProjectRegistryLive = Layer.effect(ProjectRegistry, makeProjectRegistry);

// ============================================================================
// Context Helper
// ============================================================================

const withProject = <A, E, R>(
	projectId: ProjectId,
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, ProjectId>> =>
	Effect.provideService(effect, CurrentProjectId, projectId);

// ============================================================================
// Layer Composition
// ============================================================================

// For playground/single-project environments
const PlaygroundLive = Layer.mergeAll(
	SingleProjectProviderLive,
	EventStreamLive,
).pipe(Layer.provideMerge(ProjectServiceLive));

// For server environments with multiple projects
const ServerLive = Layer.mergeAll(
	MultiProjectProviderLive,
	EventStreamLive,
	ProjectRegistryLive,
).pipe(Layer.provideMerge(ProjectServiceLive));

// ============================================================================
// HTTP API Routes (for server environment)
// ============================================================================

const CreateProjectRequest = Schema.Struct({
	name: Schema.String,
});

const AddElementRequest = Schema.Struct({
	type: Schema.Literal("rectangle", "circle", "text"),
	x: Schema.Number,
	y: Schema.Number,
	properties: Schema.Record(Schema.String, Schema.Unknown),
});

const UpdateElementRequest = Schema.Struct({
	x: Schema.optional(Schema.Number),
	y: Schema.optional(Schema.Number),
	properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

const makeProjectApi = Effect.gen(function* () {
	const service = yield* ProjectService;
	const registry = yield* ProjectRegistry;

	// POST /projects
	const createProject = Http.router.post(
		"/projects",
		Effect.gen(function* () {
			const body = yield* Http.request.schemaBodyJson(CreateProjectRequest);
			const project = yield* registry.create(body.name);
			return yield* Http.response.json(project, { status: 201 });
		}),
	);

	// GET /projects
	const listProjects = Http.router.get(
		"/projects",
		Effect.gen(function* () {
			const projects = yield* registry.list();
			return yield* Http.response.json(projects);
		}),
	);

	// GET /projects/:id
	const getProject = Http.router.get(
		"/projects/:id",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;

			const project = yield* withProject(id, service.get());
			return yield* Http.response.json(project);
		}),
	);

	// DELETE /projects/:id
	const deleteProject = Http.router.delete(
		"/projects/:id",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;
			yield* registry.delete(id);
			return yield* Http.response.empty({ status: 204 });
		}),
	);

	// POST /projects/:id/elements
	const addElement = Http.router.post(
		"/projects/:id/elements",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;
			const body = yield* Http.request.schemaBodyJson(AddElementRequest);

			const element: CanvasElement = {
				id: crypto.randomUUID(),
				...body,
			};

			const project = yield* withProject(id, service.addElement(element));
			return yield* Http.response.json(project);
		}),
	);

	// PATCH /projects/:id/elements/:elementId
	const updateElement = Http.router.patch(
		"/projects/:id/elements/:elementId",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;
			const elementId = params.elementId;
			const body = yield* Http.request.schemaBodyJson(UpdateElementRequest);

			const project = yield* withProject(
				id,
				service.updateElement(elementId, (el) => ({
					...el,
					...(body.x !== undefined && { x: body.x }),
					...(body.y !== undefined && { y: body.y }),
					...(body.properties !== undefined && {
						properties: { ...el.properties, ...body.properties },
					}),
				})),
			);

			return yield* Http.response.json(project);
		}),
	);

	// DELETE /projects/:id/elements/:elementId
	const deleteElement = Http.router.delete(
		"/projects/:id/elements/:elementId",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;
			const elementId = params.elementId;

			const project = yield* withProject(id, service.deleteElement(elementId));
			return yield* Http.response.json(project);
		}),
	);

	// PATCH /projects/:id/canvas
	const updateCanvas = Http.router.patch(
		"/projects/:id/canvas",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;
			const body = yield* Http.request.json;

			const project = yield* withProject(
				id,
				service.updateCanvas((canvas) => ({
					...canvas,
					...body,
				})),
			);

			return yield* Http.response.json(project);
		}),
	);

	// PATCH /projects/:id/name
	const renameProject = Http.router.patch(
		"/projects/:id/name",
		Effect.gen(function* () {
			const params = yield* Http.router.params;
			const id = params.id as ProjectId;
			const body = yield* Http.request.schemaBodyJson(
				Schema.Struct({ name: Schema.String }),
			);

			const project = yield* withProject(id, service.rename(body.name));
			return yield* Http.response.json(project);
		}),
	);

	return pipe(
		Http.router.empty,
		Http.router.mount(createProject),
		Http.router.mount(listProjects),
		Http.router.mount(getProject),
		Http.router.mount(deleteProject),
		Http.router.mount(addElement),
		Http.router.mount(updateElement),
		Http.router.mount(deleteElement),
		Http.router.mount(updateCanvas),
		Http.router.mount(renameProject),
		Http.middleware.catchAll((error) =>
			Effect.gen(function* () {
				if (error instanceof ProjectNotFoundError) {
					return yield* Http.response.json(
						{ error: "Project not found", projectId: error.projectId },
						{ status: 404 },
					);
				}
				return yield* Http.response.json(
					{ error: "Internal server error" },
					{ status: 500 },
				);
			}),
		),
	);
});

// ============================================================================
// Example Usage - Playground (Single Project)
// ============================================================================

const playgroundExample = Effect.gen(function* () {
	const service = yield* ProjectService;
	const eventStream = yield* EventStream;

	// Subscribe to events
	const eventLogger = pipe(
		eventStream.subscribe(),
		Stream.tap((event) => Effect.log(`EVENT: ${event._tag}`)),
		Stream.runDrain,
	);
	yield* Effect.forkDaemon(eventLogger);

	// Work with the single project - no IDs needed!
	yield* service.addElement({
		id: "rect1",
		type: "rectangle",
		x: 100,
		y: 100,
		properties: { width: 200, height: 150 },
	});

	yield* service.addElement({
		id: "circle1",
		type: "circle",
		x: 300,
		y: 300,
		properties: { radius: 50 },
	});

	yield* service.rename("My Playground Project");

	const project = yield* service.get();
	yield* Effect.log(`Project: ${project.name}`);
	yield* Effect.log(`Elements: ${project.canvas.elements.length}`);

	yield* Effect.sleep("100 millis");
});

const runnablePlayground = playgroundExample.pipe(
	Effect.provide(PlaygroundLive),
);

// ============================================================================
// Example Usage - Server (Multiple Projects)
// ============================================================================

const serverExample = Effect.gen(function* () {
	const service = yield* ProjectService;
	const registry = yield* ProjectRegistry;
	const eventStream = yield* EventStream;

	// Subscribe to events
	const eventLogger = pipe(
		eventStream.subscribe(),
		Stream.tap((event) => Effect.log(`EVENT: ${event._tag}`)),
		Stream.runDrain,
	);
	yield* Effect.forkDaemon(eventLogger);

	// Create multiple projects
	const proj1 = yield* registry.create("Design A");
	const proj2 = yield* registry.create("Design B");

	yield* Effect.log(`Created: ${proj1.id}, ${proj2.id}`);

	// Work within project contexts - service methods never take IDs
	yield* withProject(
		proj1.id,
		Effect.gen(function* () {
			yield* service.addElement({
				id: "rect1",
				type: "rectangle",
				x: 100,
				y: 100,
				properties: { width: 200, height: 150 },
			});
			yield* service.rename("Design A - Updated");
		}),
	);

	yield* withProject(
		proj2.id,
		Effect.gen(function* () {
			yield* service.addElement({
				id: "circle1",
				type: "circle",
				x: 300,
				y: 300,
				properties: { radius: 50 },
			});
		}),
	);

	// List all projects
	const allProjects = yield* registry.list();
	yield* Effect.log(`Total projects: ${allProjects.length}`);

	yield* Effect.sleep("100 millis");
});

const runnableServer = serverExample.pipe(Effect.provide(ServerLive));

// To run:
// - Effect.runPromise(runnablePlayground) for single-project mode
// - Effect.runPromise(runnableServer) for multi-project mode
