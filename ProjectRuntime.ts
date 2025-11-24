import {
	Context,
	Effect,
	HashMap,
	Layer,
	Option,
	Queue,
	Ref,
	RequestResolver,
	Schema,
	Stream,
	pipe,
} from "effect";

// ============================================================================
// Branded ID Types - Type-safe identifiers using Schema.brand()
// ============================================================================

const ProjectId = Schema.Int.pipe(Schema.brand("ProjectId"));
type ProjectId = Schema.Schema.Type<typeof ProjectId>;

const GraphId = Schema.Int.pipe(Schema.brand("GraphId"));
type GraphId = Schema.Schema.Type<typeof GraphId>;

const NodeId = Schema.Int.pipe(Schema.brand("NodeId"));
type NodeId = Schema.Schema.Type<typeof NodeId>;

const PackageId = Schema.String.pipe(Schema.brand("PackageId"));
type PackageId = Schema.Schema.Type<typeof PackageId>;

const SchemaId = Schema.String.pipe(Schema.brand("SchemaId"));
type SchemaId = Schema.Schema.Type<typeof SchemaId>;

// ============================================================================
// Domain Models - Pure Data
// ============================================================================

class Project extends Schema.Class<Project>("Project")({
	id: ProjectId,
	name: Schema.String,
	graphs: Schema.HashMap({
		key: GraphId,
		value: Schema.suspend(() => Graph),
	}),
	nextGraphId: GraphId,
	nextNodeId: NodeId,
}) {}

class Graph extends Schema.Class<Graph>("Graph")({
	id: GraphId,
	name: Schema.String,
	nodes: Schema.HashMap({ key: NodeId, value: Schema.suspend(() => Node) }),
}) {}

class Node extends Schema.Class<Node>("Node")({
	id: NodeId,
	name: Schema.String,
	schema: Schema.suspend(() => SchemaRef),
	properties: Schema.optional(
		Schema.HashMap({
			key: Schema.String,
			value: Schema.Unknown,
		}),
	),
}) {}

class SchemaRef extends Schema.Class<SchemaRef>("SchemaRef")({
	pkgId: PackageId,
	schemaId: SchemaId,
}) {}

// ============================================================================

// ============================================================================
// Schema System Models - IO and Package Schema Definitions
// ============================================================================

class InputPort extends Schema.Class<InputPort>("InputPort")({
	id: Schema.String,
	name: Schema.String,
	defaultValue: Schema.optional(Schema.Unknown),
}) {}

class OutputPort extends Schema.Class<OutputPort>("OutputPort")({
	id: Schema.String,
	name: Schema.String,
}) {}

class IOSchema extends Schema.Class<IOSchema>("IOSchema")({
	inputs: Schema.Array(InputPort),
	outputs: Schema.Array(OutputPort),
}) {}

class PackageSchema extends Schema.Class<PackageSchema>("PackageSchema")({
	id: Schema.String,
	name: Schema.String,
	description: Schema.optional(Schema.String),
	io: Schema.Any, // Using Any for function type - will be typed as IOFunction
}) {}

class Package extends Schema.Class<Package>("Package")({
	id: Schema.String,
	name: Schema.String,
	version: Schema.String,
	schemas: Schema.HashMap({
		key: Schema.String,
		value: PackageSchema,
	}),
}) {}

class NodeIOData extends Schema.Class<NodeIOData>("NodeIOData")({
	nodeId: NodeId,
	graphId: GraphId,
	inputs: Schema.HashMap({
		key: Schema.String,
		value: Schema.Unknown,
	}),
	outputs: Schema.HashMap({
		key: Schema.String,
		value: Schema.Unknown,
	}),
	schema: IOSchema,
	lastCalculated: Schema.Int,
}) {}

// Domain Events - Pure domain events using Schema.TaggedClass
// ============================================================================

class ProjectCreated extends Schema.TaggedClass<ProjectCreated>()(
	"ProjectCreated",
	{
		project: Project,
	},
) {}

class ProjectDeleted extends Schema.TaggedClass<ProjectDeleted>()(
	"ProjectDeleted",
	{},
) {}

class ProjectRenamed extends Schema.TaggedClass<ProjectRenamed>()(
	"ProjectRenamed",
	{
		project: Project,
		oldName: Schema.String,
		newName: Schema.String,
	},
) {}

class GraphAdded extends Schema.TaggedClass<GraphAdded>()("GraphAdded", {
	graph: Graph,
}) {}

class GraphDeleted extends Schema.TaggedClass<GraphDeleted>()("GraphDeleted", {
	graphId: GraphId,
}) {}

class GraphRenamed extends Schema.TaggedClass<GraphRenamed>()("GraphRenamed", {
	graph: Graph,
	oldName: Schema.String,
	newName: Schema.String,
}) {}

class NodeAdded extends Schema.TaggedClass<NodeAdded>()("NodeAdded", {
	graphId: GraphId,
	node: Node,
}) {}

class NodeDeleted extends Schema.TaggedClass<NodeDeleted>()("NodeDeleted", {
	graphId: GraphId,
	node: Node,
}) {}

class NodeUpdated extends Schema.TaggedClass<NodeUpdated>()("NodeUpdated", {
	graphId: GraphId,
	node: Node,
}) {}

class NodePropertiesUpdated extends Schema.TaggedClass<NodePropertiesUpdated>()(
	"NodePropertiesUpdated",
	{
		graphId: GraphId,
		nodeId: NodeId,
		oldProperties: Schema.optional(
			Schema.HashMap({
				key: Schema.String,
				value: Schema.Unknown,
			}),
		),
		newProperties: Schema.optional(
			Schema.HashMap({
				key: Schema.String,
				value: Schema.Unknown,
			}),
		),
		ioData: Schema.optional(NodeIOData),
	},
) {}

// Union type for all project events
type ProjectEvent =
	| ProjectCreated
	| ProjectDeleted
	| ProjectRenamed
	| GraphAdded
	| GraphDeleted
	| GraphRenamed
	| NodeAdded
	| NodeDeleted
	| NodeUpdated
	| NodePropertiesUpdated;

// Schema for serialization/deserialization
const ProjectEventSchema = Schema.Union(
	ProjectCreated,
	ProjectDeleted,
	ProjectRenamed,
	GraphAdded,
	GraphDeleted,
	GraphRenamed,
	NodeAdded,
	NodeDeleted,
	NodeUpdated,
	NodePropertiesUpdated,
);

// ============================================================================
// Serialization Errors - Using Schema.TaggedError for validation and type safety
// ============================================================================

class SerializationError extends Schema.TaggedError<SerializationError>()(
	"SerializationError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Unknown),
	},
) {}

class DeserializationError extends Schema.TaggedError<DeserializationError>()(
	"DeserializationError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Unknown),
	},
) {}

// ============================================================================
// Domain Errors - Using Schema.TaggedError for validation and type safety
// ============================================================================

class ProjectNotFoundError extends Schema.TaggedError<ProjectNotFoundError>()(
	"ProjectNotFoundError",
	{
		projectId: ProjectId,
	},
) {}

class GraphNotFoundError extends Schema.TaggedError<GraphNotFoundError>()(
	"GraphNotFoundError",
	{
		graphId: GraphId,
	},
) {}

class NodeNotFoundError extends Schema.TaggedError<NodeNotFoundError>()(
	"NodeNotFoundError",
	{
		nodeId: NodeId,
	},
) {}

// ============================================================================
// IO Errors - Schema system specific errors
// ============================================================================

class PackageNotFoundError extends Schema.TaggedError<PackageNotFoundError>()(
	"PackageNotFoundError",
	{
		pkgId: PackageId,
	},
) {}

class SchemaNotFoundError extends Schema.TaggedError<SchemaNotFoundError>()(
	"SchemaNotFoundError",
	{
		pkgId: PackageId,
		schemaId: SchemaId,
	},
) {}

class IOCalculationError extends Schema.TaggedError<IOCalculationError>()(
	"IOCalculationError",
	{
		graphId: GraphId,
		nodeId: NodeId,
		cause: Schema.String,
		properties: Schema.optional(
			Schema.HashMap({
				key: Schema.String,
				value: Schema.Unknown,
			}),
		),
	},
) {}

class IOValidationError extends Schema.TaggedError<IOValidationError>()(
	"IOValidationError",
	{
		graphId: GraphId,
		nodeId: NodeId,
		validationErrors: Schema.Array(Schema.String),
	},
) {}

class IONotFoundError extends Schema.TaggedError<IONotFoundError>()(
	"IONotFoundError",
	{
		graphId: GraphId,
		nodeId: NodeId,
	},
) {}

// Union type for all project errors
type ProjectError =
	| SerializationError
	| DeserializationError
	| ProjectNotFoundError
	| GraphNotFoundError
	| NodeNotFoundError
	| PackageNotFoundError
	| SchemaNotFoundError
	| IOCalculationError
	| IOValidationError
	| IONotFoundError;

// Schema for error serialization/deserialization
const ProjectErrorSchema = Schema.Union(
	SerializationError,
	DeserializationError,
	ProjectNotFoundError,
	GraphNotFoundError,
	NodeNotFoundError,
	PackageNotFoundError,
	SchemaNotFoundError,
	IOCalculationError,
	IOValidationError,
	IONotFoundError,
);

// ============================================================================
// Request API - TaggedRequest classes for efficient data access
// ============================================================================

// Project Requests
class GetProjectRequest extends Schema.TaggedRequest<GetProjectRequest>()(
	"GetProjectRequest",
	{
		payload: {}, // Empty payload - uses current project
		success: Project,
		failure: ProjectNotFoundError,
	},
) {}

// Graph Requests
class GetGraphRequest extends Schema.TaggedRequest<GetGraphRequest>()(
	"GetGraphRequest",
	{
		payload: { graphId: GraphId },
		success: Graph,
		failure: GraphNotFoundError,
	},
) {}

class CreateGraphRequest extends Schema.TaggedRequest<CreateGraphRequest>()(
	"CreateGraphRequest",
	{
		payload: { name: Schema.String },
		success: GraphAdded,
		failure: Schema.Never,
	},
) {}

class DeleteGraphRequest extends Schema.TaggedRequest<DeleteGraphRequest>()(
	"DeleteGraphRequest",
	{
		payload: { graphId: GraphId },
		success: Schema.Void,
		failure: GraphNotFoundError,
	},
) {}

// Node Requests
class GetNodeRequest extends Schema.TaggedRequest<GetNodeRequest>()(
	"GetNodeRequest",
	{
		payload: { graphId: GraphId, nodeId: NodeId },
		success: Node,
		failure: NodeNotFoundError,
	},
) {}

class AddNodeRequest extends Schema.TaggedRequest<AddNodeRequest>()(
	"AddNodeRequest",
	{
		payload: {
			graphId: GraphId,
			schemaRef: SchemaRef,
			name: Schema.String,
		},
		success: NodeAdded,
		failure: Schema.Never,
	},
) {}

class UpdateNodePropertiesRequest extends Schema.TaggedRequest<UpdateNodePropertiesRequest>()(
	"UpdateNodePropertiesRequest",
	{
		payload: {
			graphId: GraphId,
			nodeId: NodeId,
			properties: Schema.HashMap({
				key: Schema.String,
				value: Schema.Unknown,
			}),
		},
		success: NodePropertiesUpdated,
		failure: NodeNotFoundError,
	},
) {}

// Package Requests
class GetPackageRequest extends Schema.TaggedRequest<GetPackageRequest>()(
	"GetPackageRequest",
	{
		payload: { pkgId: PackageId },
		success: Package,
		failure: PackageNotFoundError,
	},
) {}

class GetSchemaRequest extends Schema.TaggedRequest<GetSchemaRequest>()(
	"GetSchemaRequest",
	{
		payload: { pkgId: PackageId, schemaId: SchemaId },
		success: PackageSchema,
		failure: SchemaNotFoundError,
	},
) {}

// IO Requests
class GetIODataRequest extends Schema.TaggedRequest<GetIODataRequest>()(
	"GetIODataRequest",
	{
		payload: { nodeId: NodeId, graphId: GraphId },
		success: NodeIOData,
		failure: IONotFoundError,
	},
) {}

class RecalculateIORequest extends Schema.TaggedRequest<RecalculateIORequest>()(
	"RecalculateIORequest",
	{
		payload: {
			nodeId: NodeId,
			properties: Schema.HashMap({
				key: Schema.String,
				value: Schema.Unknown,
			}),
		},
		success: NodeIOData,
		failure: IOCalculationError,
	},
) {}

// ============================================================================
// Request Resolvers - Effect-based resolvers for request handling
// ============================================================================

// Event type that nodes can respond to
type NodeEventType = string; // e.g., "websocket.message", "http.request", "timer.tick"

// Helper to determine if a node is an event node and what events it handles
// This would be implemented by the package system in real code
function getEventTypesForNode(
	schemaRef: SchemaRef,
): ReadonlyArray<NodeEventType> {
	// Example implementation - in real code this would look up the actual node schema
	if (schemaRef.schemaId === "event") return ["custom.event"];
	if (schemaRef.schemaId === "websocket")
		return ["websocket.message", "websocket.connect", "websocket.disconnect"];
	if (schemaRef.schemaId === "http") return ["http.request"];
	if (schemaRef.schemaId === "timer") return ["timer.tick"];
	return []; // Not an event node
}

// ============================================================================
// Event Stream
// ============================================================================

class EventStream extends Effect.Service<EventStream>()("EventStream", {
	effect: Effect.gen(function* () {
		const queue = yield* Queue.unbounded<ProjectEvent>();

		return {
			publish: (event: ProjectEvent) => Queue.offer(queue, event),
			subscribe: () => Stream.fromQueue(queue),
		};
	}),
}) {}

// ============================================================================
// Event Cache - Maps event types to nodes for efficient lookup
// ============================================================================

// Cache entry that maps an event type to nodes that can handle it
interface EventCacheEntry {
	readonly eventType: NodeEventType;
	readonly nodes: ReadonlyArray<{
		readonly projectId: ProjectId;
		readonly graphId: GraphId;
		readonly nodeId: NodeId;
		readonly node: Node;
	}>;
}

// Cache stats for debugging
interface CacheStats {
	readonly totalEventTypes: number;
	readonly totalNodes: number;
	readonly eventTypes: ReadonlyArray<NodeEventType>;
}

// EventNodeCache interface - nested cache object within ProjectRuntime
interface EventNodeCache {
	readonly getNodesForEvent: (eventType: NodeEventType) => Effect.Effect<
		ReadonlyArray<{
			readonly projectId: number;
			readonly graphId: number;
			readonly nodeId: number;
			readonly node: Node;
		}>,
		never,
		never
	>;
	readonly hasEventHandlers: (
		eventType: NodeEventType,
	) => Effect.Effect<boolean, never, never>;
	readonly rebuildCache: (
		project: Option.Option<Project>,
	) => Effect.Effect<void, never, never>;
	readonly getCacheStats: () => Effect.Effect<CacheStats, never, never>;
}

// ============================================================================
// NEW: Project Runtime - Isolated data containers for project + event cache
// ============================================================================

// Runtime interface - data containers + nested EventNodeCache
interface ProjectRuntime {
	readonly projectRef: Ref.Ref<Option.Option<Project>>; // Current project state
	readonly eventNodeCache: EventNodeCache; // Nested event cache object
	readonly eventQueue: Queue.Queue<ProjectEvent>; // Runtime-local events
}

// Context tag for current runtime
class CurrentRuntime extends Context.Tag("CurrentRuntime")<
	CurrentRuntime,
	ProjectRuntime
>() {}

// Helper to get project from runtime (handles Option<Project>)
const getProjectFromRuntime = (
	runtime: ProjectRuntime,
): Effect.Effect<Project, ProjectNotFoundError> =>
	pipe(
		Ref.get(runtime.projectRef),
		Effect.flatMap(
			Option.match({
				onNone: () =>
					Effect.fail(new ProjectNotFoundError({ projectId: 0 as ProjectId })),
				onSome: Effect.succeed,
			}),
		),
	);

// Factory function to create an EventNodeCache instance
const makeEventNodeCache = (
	eventCacheRef: Ref.Ref<HashMap.HashMap<NodeEventType, EventCacheEntry>>,
): EventNodeCache => {
	return {
		getNodesForEvent: (eventType: NodeEventType) =>
			pipe(
				Ref.get(eventCacheRef),
				Effect.map((cache) => {
					const entry = HashMap.get(cache, eventType);
					return Option.isSome(entry) ? entry.value.nodes : [];
				}),
			),

		hasEventHandlers: (eventType: NodeEventType) =>
			pipe(
				Ref.get(eventCacheRef),
				Effect.map((cache) => HashMap.has(cache, eventType)),
			),

		rebuildCache: (projectOpt: Option.Option<Project>) =>
			Option.match(projectOpt, {
				onNone: () =>
					Ref.set(
						eventCacheRef,
						HashMap.empty<NodeEventType, EventCacheEntry>(),
					),
				onSome: (project) => {
					let newCache = HashMap.empty<NodeEventType, EventCacheEntry>();

					// Iterate through all graphs and nodes in the project
					for (const [graphId, graph] of project.graphs) {
						for (const [nodeId, node] of graph.nodes) {
							const eventTypes = getEventTypesForNode(node.schema);

							// Add this node to cache entries for each event type it handles
							for (const eventType of eventTypes) {
								const existing = HashMap.get(newCache, eventType);

								if (Option.isSome(existing)) {
									// Add to existing entry
									const updatedEntry: EventCacheEntry = {
										...existing.value,
										nodes: [
											...existing.value.nodes,
											{
												projectId: project.id,
												graphId,
												nodeId,
												node,
											},
										],
									};
									newCache = HashMap.set(newCache, eventType, updatedEntry);
								} else {
									// Create new entry
									const newEntry: EventCacheEntry = {
										eventType,
										nodes: [
											{
												projectId: project.id,
												graphId,
												nodeId,
												node,
											},
										],
									};
									newCache = HashMap.set(newCache, eventType, newEntry);
								}
							}
						}
					}

					return Ref.set(eventCacheRef, newCache);
				},
			}),

		getCacheStats: () =>
			pipe(
				Ref.get(eventCacheRef),
				Effect.map((cache) => ({
					totalEventTypes: HashMap.size(cache),
					totalNodes: Array.from(HashMap.values(cache)).reduce(
						(sum, entry: EventCacheEntry) => sum + entry.nodes.length,
						0,
					),
					eventTypes: Array.from(HashMap.keys(cache)),
				})),
			),
	};
};

// ============================================================================
// NEW: Runtime Factory - Creates isolated runtime instances
// ============================================================================

// Factory function to create a new ProjectRuntime instance
const makeProjectRuntime = (
	initialProject?: Project,
): Effect.Effect<ProjectRuntime, never, never> =>
	Effect.gen(function* () {
		const projectRef = yield* Ref.make(
			initialProject ? Option.some(initialProject) : Option.none(),
		);
		const eventCacheRef = yield* Ref.make(
			HashMap.empty<NodeEventType, EventCacheEntry>(),
		);
		const eventQueue = yield* Queue.unbounded<ProjectEvent>();

		// Create the EventNodeCache instance
		const eventNodeCache = makeEventNodeCache(eventCacheRef);

		// Helper function to build cache from project
		const buildCacheFromProject = (
			project: Project,
		): Effect.Effect<void, never, never> =>
			Effect.gen(function* () {
				let newCache = HashMap.empty<NodeEventType, EventCacheEntry>();

				// Iterate through all graphs and nodes in the project
				for (const [graphId, graph] of project.graphs) {
					for (const [nodeId, node] of graph.nodes) {
						const eventTypes = getEventTypesForNode(node.schema);

						// Add this node to cache entries for each event type it handles
						for (const eventType of eventTypes) {
							const existing = HashMap.get(newCache, eventType);

							if (Option.isSome(existing)) {
								// Add to existing entry
								const updatedEntry: EventCacheEntry = {
									...existing.value,
									nodes: [
										...existing.value.nodes,
										{
											projectId: project.id,
											graphId,
											nodeId,
											node,
										},
									],
								};
								newCache = HashMap.set(newCache, eventType, updatedEntry);
							} else {
								// Create new entry
								const newEntry: EventCacheEntry = {
									eventType,
									nodes: [
										{
											projectId: project.id,
											graphId,
											nodeId,
											node,
										},
									],
								};
								newCache = HashMap.set(newCache, eventType, newEntry);
							}
						}
					}
				}

				yield* Ref.set(eventCacheRef, newCache);
			});

		// Start cache maintenance listener
		const cacheMaintainer = Effect.gen(function* () {
			return pipe(
				Stream.fromQueue(eventQueue),
				Stream.tap((event) =>
					Effect.gen(function* () {
						switch (event._tag) {
							case "NodeAdded": {
								const eventTypes = getEventTypesForNode(event.node.schema);
								for (const eventType of eventTypes) {
									yield* Ref.update(eventCacheRef, (cache) => {
										const existing = HashMap.get(cache, eventType);
										if (Option.isSome(existing)) {
											const updatedEntry: EventCacheEntry = {
												eventType: existing.value.eventType,
												nodes: [
													...existing.value.nodes,
													{
														projectId: ProjectId.make(0), // Will be added as metadata in multi-project environments
														graphId: event.graphId,
														nodeId: event.node.id,
														node: event.node,
													},
												],
											};
											return HashMap.set(cache, eventType, updatedEntry);
										}

										const newEntry: EventCacheEntry = {
											eventType,
											nodes: [
												{
													projectId: ProjectId.make(0), // Will be added as metadata in multi-project environments
													graphId: event.graphId,
													nodeId: event.node.id,
													node: event.node,
												},
											],
										};
										return HashMap.set(cache, eventType, newEntry);
									});
								}
								break;
							}
							case "NodeDeleted": {
								// Remove this node from all cache entries
								yield* Ref.update(eventCacheRef, (cache) => {
									let updatedCache = HashMap.empty<
										NodeEventType,
										EventCacheEntry
									>();
									for (const [eventType, entry] of cache) {
										const filteredNodes = entry.nodes.filter(
											(n) =>
												!(
													n.graphId === event.graphId &&
													n.nodeId === event.node.id
												),
										);
										if (filteredNodes.length > 0) {
											updatedCache = HashMap.set(updatedCache, eventType, {
												eventType: entry.eventType,
												nodes: filteredNodes,
											});
										}
									}
									return updatedCache;
								});
								break;
							}
							case "NodeUpdated": {
								// For updates, we need to re-evaluate the node's event types
								// This is a simplified approach - in practice you might want to:
								// 1. Remove old entries for this node
								// 2. Add new entries based on updated schema
								// For now, we'll treat it as a delete + add
								break;
							}
							case "NodePropertiesUpdated": {
								// Property changes don't affect event types, so no cache update needed
								break;
							}
						}
					}),
				),
				Stream.runDrain,
			);
		});

		yield* Effect.forkDaemon(cacheMaintainer);

		// If we have an initial project, build the cache
		if (initialProject) {
			yield* buildCacheFromProject(initialProject);
		}

		return {
			projectRef,
			eventNodeCache,
			eventQueue,
		};
	});

// ============================================================================
// Project Provider - Abstract way to get/set the current project
// ============================================================================

class ProjectProvider extends Context.Tag("ProjectProvider")<
	ProjectProvider,
	{
		readonly getCurrent: () => Effect.Effect<Project, ProjectNotFoundError>;
		readonly setCurrent: (project: Project) => Effect.Effect<void>;
	}
>() {}

// ============================================================================
// Project Service - Works on "current" project only (refactored to use CurrentRuntime)
// ============================================================================

// This service never takes projectId - it always operates on the "current" project
class ProjectService extends Effect.Service<ProjectService>()(
	"ProjectService",
	{
		effect: Effect.gen(function* () {
			return {
				get: Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					return yield* getProjectFromRuntime(runtime);
				}),

				rename: (newName: string) =>
					Effect.gen(function* () {
						const runtime = yield* CurrentRuntime;
						const oldProject = yield* getProjectFromRuntime(runtime);
						const updated = new Project({
							...oldProject,
							name: newName,
						});

						const event = new ProjectRenamed({
							project: updated,
							oldName: oldProject.name,
							newName,
						});

						yield* Ref.set(runtime.projectRef, Option.some(updated));
						yield* Queue.offer(runtime.eventQueue, event);

						return event;
					}),
			};
		}),
	},
) {}

// ============================================================================
// Graph Service - Graph operations on current project (refactored to use CurrentRuntime)
// ============================================================================

// Takes graphId as parameter, operates on current project
class GraphService extends Effect.Service<GraphService>()("GraphService", {
	effect: Effect.gen(function* () {
		const events = yield* EventStream;

		return {
			create: (name: string) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graphId = project.nextGraphId;

					const newGraph = new Graph({
						id: graphId,
						name,
						nodes: HashMap.empty(),
					});

					const updated = new Project({
						...project,
						graphs: HashMap.set(project.graphs, graphId, newGraph),
						nextGraphId: GraphId.make(graphId + 1),
					});

					const event = new GraphAdded({
						graph: newGraph,
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));
					yield* Queue.offer(runtime.eventQueue, event);

					return event;
				}),

			get: (graphId: GraphId) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);

					return yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);
				}),

			delete: (graphId: GraphId) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);

					// Check graph exists
					if (!HashMap.has(project.graphs, graphId)) {
						return yield* Effect.fail(new GraphNotFoundError({ graphId }));
					}

					const updated = new Project({
						...project,
						graphs: HashMap.remove(project.graphs, graphId),
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));
					yield* Queue.offer(
						runtime.eventQueue,
						new GraphDeleted({
							graphId,
						}),
					);
				}),

			rename: (graphId: GraphId, newName: string) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graph = yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);

					const updatedGraph = new Graph({
						...graph,
						name: newName,
					});

					const updated = new Project({
						...project,
						graphs: HashMap.set(project.graphs, graphId, updatedGraph),
					});

					const event = new GraphRenamed({
						graph: updatedGraph,
						oldName: graph.name,
						newName,
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));
					yield* Queue.offer(runtime.eventQueue, event);

					return event;
				}),

			addNode: (graphId: GraphId, schemaRef: SchemaRef, name: string) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graph = yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);

					const nodeId = project.nextNodeId;
					const newNode = new Node({
						id: nodeId,
						name,
						schema: schemaRef,
					});

					const updatedGraph = new Graph({
						...graph,
						nodes: HashMap.set(graph.nodes, nodeId, newNode),
					});

					const updated = new Project({
						...project,
						graphs: HashMap.set(project.graphs, graphId, updatedGraph),
						nextNodeId: NodeId.make(nodeId + 1),
					});

					const event = new NodeAdded({
						graphId,
						node: newNode,
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));
					yield* Queue.offer(runtime.eventQueue, event);

					return event;
				}),

			deleteNode: (graphId: GraphId, nodeId: NodeId) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graph = yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);

					const node = yield* pipe(
						HashMap.get(graph.nodes, nodeId),
						Effect.mapError(() => new NodeNotFoundError({ nodeId })),
					);

					const updatedGraph = new Graph({
						...graph,
						nodes: HashMap.remove(graph.nodes, nodeId),
					});

					const updated = new Project({
						...project,
						graphs: HashMap.set(project.graphs, graphId, updatedGraph),
					});

					const event = new NodeDeleted({
						graphId,
						node,
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));
					yield* Queue.offer(runtime.eventQueue, event);
				}),

			updateNode: (
				graphId: GraphId,
				nodeId: NodeId,
				fn: (node: Node) => Node,
			) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graph = yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);

					const node = yield* pipe(
						HashMap.get(graph.nodes, nodeId),
						Effect.mapError(() => new NodeNotFoundError({ nodeId })),
					);

					const updatedNode = fn(node);

					const updatedGraph = new Graph({
						...graph,
						nodes: HashMap.set(graph.nodes, nodeId, updatedNode),
					});

					const updated = new Project({
						...project,
						graphs: HashMap.set(project.graphs, graphId, updatedGraph),
					});

					const event = new NodeUpdated({
						graphId,
						node: updatedNode,
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));
					yield* Queue.offer(runtime.eventQueue, event);

					return event;
				}),

			updateNodeProperties: (
				graphId: GraphId,
				nodeId: NodeId,
				properties: HashMap.HashMap<string, unknown>,
			) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graph = yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);

					const node = yield* pipe(
						HashMap.get(graph.nodes, nodeId),
						Effect.mapError(() => new NodeNotFoundError({ nodeId })),
					);

					const oldProperties = node.properties;
					const updatedNode = new Node({
						...node,
						properties,
					});

					const updatedGraph = new Graph({
						...graph,
						nodes: HashMap.set(graph.nodes, nodeId, updatedNode),
					});

					const updated = new Project({
						...project,
						graphs: HashMap.set(project.graphs, graphId, updatedGraph),
					});

					yield* Ref.set(runtime.projectRef, Option.some(updated));

					// NEW: Recalculate IO data for this node
					const ioManager = yield* IOManager;
					const ioData = yield* ioManager.recalculateIO(nodeId, properties);

					const event = new NodePropertiesUpdated({
						graphId,
						nodeId,
						oldProperties,
						newProperties: properties,
						ioData, // Include the new IO data
					});

					yield* Queue.offer(runtime.eventQueue, event);

					return event;
				}),

			getNodeProperties: (graphId: GraphId, nodeId: NodeId) =>
				Effect.gen(function* () {
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);
					const graph = yield* pipe(
						HashMap.get(project.graphs, graphId),
						Effect.mapError(() => new GraphNotFoundError({ graphId })),
					);

					const node = yield* pipe(
						HashMap.get(graph.nodes, nodeId),
						Effect.mapError(() => new NodeNotFoundError({ nodeId })),
					);

					return node.properties ?? HashMap.empty();
				}),

			// NEW: Get IO data for a node
			getNodeIOData: (graphId: GraphId, nodeId: NodeId) =>
				Effect.gen(function* () {
					const ioManager = yield* IOManager;
					return yield* ioManager.getIOData(nodeId, graphId);
				}),
		};
	}),
}) {}

// ============================================================================
// Multi Project - Shared state for server environments (moved up for dependency ordering)
// ============================================================================

class ProjectsRef extends Effect.Service<ProjectsRef>()("ProjectsRef", {
	effect: Effect.map(
		Ref.make(HashMap.empty<number, ProjectRuntime>()),
		(ref) => ({ ref }),
	),
}) {}

// ============================================================================
// Single Project Provider - For playground/desktop environments
// ============================================================================

class SingleProjectRef extends Effect.Service<SingleProjectRef>()(
	"SingleProjectRef",
	{
		effect: Effect.map(
			Ref.make<Project>(
				new Project({
					id: ProjectId.make(1),
					name: "Untitled Project",
					graphs: HashMap.empty(),
					nextGraphId: GraphId.make(1),
					nextNodeId: NodeId.make(1),
				}),
			),
			(ref) => ({ ref }),
		),
	},
) {}

const makeSingleProjectProvider = Effect.gen(function* () {
	const singleProjectRef = yield* SingleProjectRef;

	return {
		getCurrent: (): Effect.Effect<Project, ProjectNotFoundError, never> =>
			Ref.get(singleProjectRef.ref) as Effect.Effect<
				Project,
				ProjectNotFoundError,
				never
			>,
		setCurrent: (project: Project) => Ref.set(singleProjectRef.ref, project),
	};
});

const SingleProjectProviderLive = Layer.effect(
	ProjectProvider,
	makeSingleProjectProvider,
).pipe(Layer.provide(SingleProjectRef.Default));

// ============================================================================
// Playground Operations - Single-project specific operations
// ============================================================================

class PlaygroundOps extends Effect.Service<PlaygroundOps>()("PlaygroundOps", {
	effect: Effect.gen(function* () {
		const projectRef = yield* SingleProjectRef;
		const events = yield* EventStream;

		return {
			reset: () =>
				Effect.gen(function* () {
					const newProject = new Project({
						id: ProjectId.make(1),
						name: "Untitled Project",
						graphs: HashMap.empty(),
						nextGraphId: GraphId.make(1),
						nextNodeId: NodeId.make(1),
					});
					yield* Ref.set(projectRef.ref, newProject);

					// Rebuild cache for the new project using runtime
					const runtime = yield* CurrentRuntime;
					yield* runtime.eventNodeCache.rebuildCache(Option.some(newProject));

					const event = new ProjectCreated({
						project: newProject,
					});

					yield* events.publish(event);
					return event;
				}),

			load: (project: Project) =>
				Effect.gen(function* () {
					yield* Ref.set(projectRef.ref, project);

					// Rebuild cache for the loaded project using runtime
					const runtime = yield* CurrentRuntime;
					yield* runtime.eventNodeCache.rebuildCache(Option.some(project));

					yield* events.publish(
						new ProjectCreated({
							project,
						}),
					);
				}),
		};
	}),
	dependencies: [EventStream.Default],
}) {}

// ============================================================================
// Project Registry - Multi-project coordination (create, list, delete, etc.) - REFACTORED
// ============================================================================

class ProjectRegistry extends Effect.Service<ProjectRegistry>()(
	"ProjectRegistry",
	{
		effect: Effect.gen(function* () {
			const projectsRef = yield* ProjectsRef;
			const events = yield* EventStream;
			const nextIdRef = yield* Ref.make(1);

			return {
				create: (name: string) =>
					Effect.gen(function* () {
						const id = yield* Ref.getAndUpdate(nextIdRef, (n) => n + 1);
						const project = new Project({
							id: ProjectId.make(id),
							name,
							graphs: HashMap.empty(),
							nextGraphId: GraphId.make(1),
							nextNodeId: NodeId.make(1),
						});

						// Create a ProjectRuntime for this project
						const runtime = yield* makeProjectRuntime(project);

						yield* Ref.update(projectsRef.ref, (runtimes) =>
							HashMap.set(runtimes, id, runtime),
						);

						const event = new ProjectCreated({
							project,
						});

						yield* events.publish(event);
						return event;
					}),

				list: () =>
					pipe(
						Ref.get(projectsRef.ref),
						Effect.flatMap((runtimes) =>
							Effect.all(
								Array.from(HashMap.values(runtimes)).map((runtime) =>
									// Extract project from runtime
									pipe(
										Ref.get(runtime.projectRef),
										Effect.map(Option.getOrThrow),
									),
								),
							),
						),
						Effect.map((projects) => projects),
					),

				get: (id: ProjectId) =>
					Effect.gen(function* () {
						const runtimes = yield* Ref.get(projectsRef.ref);
						const runtime = yield* pipe(
							HashMap.get(runtimes, id),
							Effect.mapError(
								() => new ProjectNotFoundError({ projectId: id }),
							),
						);

						// Extract project from runtime
						return yield* pipe(
							Ref.get(runtime.projectRef),
							Effect.map(Option.getOrThrow),
						);
					}),

				delete: (id: ProjectId) =>
					Effect.gen(function* () {
						const runtimes = yield* Ref.get(projectsRef.ref);
						if (!HashMap.has(runtimes, id)) {
							return yield* Effect.fail(
								new ProjectNotFoundError({ projectId: id }),
							);
						}
						yield* Ref.update(projectsRef.ref, (runtimes) =>
							HashMap.remove(runtimes, id),
						);

						yield* events.publish(new ProjectDeleted({}));
					}),

				// Load multiple projects (create runtimes for each)
				loadProjects: (projects: ReadonlyArray<Project>) =>
					Effect.gen(function* () {
						const runtimes = yield* Effect.all(
							projects.map((project) =>
								Effect.map(
									makeProjectRuntime(project),
									(runtime) => [project.id, runtime] as const,
								),
							),
						);

						yield* Ref.set(projectsRef.ref, HashMap.fromIterable(runtimes));
					}),
			};
		}),
		dependencies: [EventStream.Default],
	},
) {}

// ============================================================================
// Package Registry Service - Manages schema packages
// ============================================================================

class PackageRegistry extends Effect.Service<PackageRegistry>()(
	"PackageRegistry",
	{
		effect: Effect.gen(function* () {
			const packagesRef = yield* Ref.make(HashMap.empty<string, Package>());

			return {
				register: (pkg: Package) =>
					Ref.update(packagesRef, (map) => HashMap.set(map, pkg.id, pkg)),

				get: (pkgId: PackageId) =>
					pipe(
						Ref.get(packagesRef),
						Effect.flatMap((map) =>
							pipe(
								HashMap.get(map, pkgId),
								Effect.mapError(() => new PackageNotFoundError({ pkgId })),
							),
						),
					),

				getSchema: (pkgId: PackageId, schemaId: SchemaId) =>
					Effect.gen(function* () {
						const packages = yield* Ref.get(packagesRef);
						const pkg = yield* pipe(
							HashMap.get(packages, pkgId),
							Effect.mapError(() => new PackageNotFoundError({ pkgId })),
						);
						return yield* pipe(
							HashMap.get(pkg.schemas, schemaId),
							Effect.mapError(
								() => new SchemaNotFoundError({ pkgId, schemaId }),
							),
						);
					}),

				list: () => Ref.get(packagesRef).pipe(Effect.map(HashMap.values)),
			};
		}),
	},
) {}

// ============================================================================
// NEW: IO Manager - Handles synchronous IO recalculation for nodes
// ============================================================================

class IOManager extends Effect.Service<IOManager>()("IOManager", {
	effect: Effect.gen(function* () {
		const packageRegistry = yield* PackageRegistry;
		const ioDataRef = yield* Ref.make(HashMap.empty<number, NodeIOData>());

		return {
			// Recalculate IO for a specific node
			recalculateIO: (
				nodeId: NodeId,
				properties: HashMap.HashMap<string, any>,
			) =>
				Effect.gen(function* () {
					// Get the node from the current runtime
					const runtime = yield* CurrentRuntime;
					const project = yield* getProjectFromRuntime(runtime);

					// Find the node across all graphs
					let node: Node | null = null;
					let graphId: number | null = null;

					for (const [gid, graph] of project.graphs) {
						const foundNode = HashMap.get(graph.nodes, nodeId);
						if (Option.isSome(foundNode)) {
							node = foundNode.value;
							graphId = gid;
							break;
						}
					}

					if (!node || !graphId) {
						return yield* Effect.fail(new NodeNotFoundError({ nodeId }));
					}

					// Get the package schema
					const schema = yield* packageRegistry.getSchema(
						node.schema.pkgId,
						node.schema.schemaId,
					);

					// Calculate new IO data using the schema's IO function
					const newIOData = yield* Effect.try({
						try: () => schema.io(properties),
						catch: (error) =>
							new IOCalculationError({
								graphId: GraphId.make(graphId),
								nodeId: NodeId.make(nodeId),
								cause: String(error),
							}),
					});

					// Store the new IO data
					yield* Ref.update(ioDataRef, (map) =>
						HashMap.set(map, nodeId, newIOData),
					);

					return newIOData;
				}),

			// Get IO data for a node
			getIOData: (nodeId: NodeId, graphId: GraphId) =>
				pipe(
					Ref.get(ioDataRef),
					Effect.flatMap((map) =>
						pipe(
							HashMap.get(map, nodeId),
							Effect.mapError(() => new IONotFoundError({ graphId, nodeId })),
						),
					),
				),

			// Clear IO data for a node (when node is deleted)
			clearIOData: (nodeId: NodeId) =>
				Ref.update(ioDataRef, (map) => HashMap.remove(map, nodeId)),

			// Clear all IO data (when project changes)
			clearAllIOData: () =>
				Ref.set(ioDataRef, HashMap.empty<number, NodeIOData>()),
		};
	}),
	dependencies: [PackageRegistry.Default],
}) {}

// ============================================================================
// NEW: Single Project Runtime Layer - For playground/desktop environments
// ============================================================================

const makeSingleProjectRuntime = Effect.gen(function* () {
	const runtime = yield* makeProjectRuntime(
		new Project({
			id: ProjectId.make(1),
			name: "Untitled Project",
			graphs: HashMap.empty(),
			nextGraphId: GraphId.make(1),
			nextNodeId: NodeId.make(1),
		}),
	);

	return runtime;
});

const SingleProjectRuntimeLive = Layer.effect(
	CurrentRuntime,
	makeSingleProjectRuntime,
);

// ============================================================================
// NEW: Multi Project Runtime Switching - For server environments
// ============================================================================

// Helper to switch current runtime for a specific project
const withProjectRuntime = <A, E, R>(
	projectId: ProjectId,
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | ProjectNotFoundError, Exclude<R, CurrentRuntime>> =>
	Effect.gen(function* () {
		const projectsRef = yield* ProjectsRef;
		const runtimes = yield* Ref.get(projectsRef.ref);

		const runtime = yield* pipe(
			HashMap.get(runtimes, projectId),
			Effect.mapError(() => new ProjectNotFoundError({ projectId })),
		);

		// Run the effect with this runtime as the current runtime
		return yield* Effect.provideService(effect, CurrentRuntime, runtime);
	}).pipe(Effect.provide(ProjectsRef.Default));

// ============================================================================
// NEW: Layer Compositions with Runtime Isolation
// ============================================================================

// For playground/single-project environments (desktop) - with runtime isolation
const PlaygroundRuntimeLive = Layer.mergeAll(
	SingleProjectRuntimeLive,
	EventStream.Default,
	ProjectService.Default,
	GraphService.Default,
	PackageRegistry.Default,
	IOManager.Default,
);

// For server environments with multiple projects - with runtime switching
const ServerRuntimeLive = Layer.mergeAll(
	ProjectsRef.Default,
	EventStream.Default,
	ProjectRegistry.Default,
	ProjectService.Default,
	GraphService.Default,
	PackageRegistry.Default,
	IOManager.Default,
);

// ============================================================================
// Layer Composition
// ============================================================================

// For playground/single-project environments (desktop)
const PlaygroundLive = Layer.mergeAll(
	SingleProjectProviderLive,
	EventStream.Default,
	PlaygroundOps.Default,
	ProjectService.Default,
	GraphService.Default,
	PackageRegistry.Default,
	IOManager.Default,
);

// For server environments with multiple projects
const ServerLive = Layer.mergeAll(
	ProjectsRef.Default,
	EventStream.Default,
	ProjectRegistry.Default,
	ProjectService.Default,
	GraphService.Default,
	PackageRegistry.Default,
	IOManager.Default,
);

// ============================================================================
// Example Usage - Playground (Single Project)
// ============================================================================

const playgroundExample = Effect.gen(function* () {
	const projectService = yield* ProjectService;
	const graphService = yield* GraphService;
	const runtime = yield* CurrentRuntime;

	// Subscribe to events
	const eventLogger = pipe(
		Stream.fromQueue(runtime.eventQueue),
		Stream.tap((event) => Effect.log(`EVENT: ${event._tag}`)),
		Stream.runDrain,
	);
	yield* Effect.forkDaemon(eventLogger);

	// Work with the single project - no project IDs needed!
	const project = yield* projectService.get;
	yield* Effect.log(`Starting with project: ${project.name}`);

	// Create a graph
	const graph1Event = yield* graphService.create("Main Graph");
	const graph1 = graph1Event.graph;
	yield* Effect.log(
		`Created graph: ${graph1.name} (ID: ${GraphId.make(graph1.id)})`,
	);

	// Add nodes to the graph
	const node1Event = yield* graphService.addNode(
		graph1.id,
		new SchemaRef({
			pkgId: PackageId.make("core"),
			schemaId: SchemaId.make("log"),
		}),
		"Log Node",
	);
	const node1 = node1Event.node;
	yield* Effect.log(`Added node: ${node1.name} (ID: ${NodeId.make(node1.id)})`);

	const node2Event = yield* graphService.addNode(
		graph1.id,
		new SchemaRef({
			pkgId: PackageId.make("core"),
			schemaId: SchemaId.make("math"),
		}),
		"Math Node",
	);
	const node2 = node2Event.node;
	yield* Effect.log(`Added node: ${node2.name} (ID: ${NodeId.make(node2.id)})`);

	// Demonstrate node properties
	yield* Effect.log("Setting node properties...");
	const properties = HashMap.make(
		["message", "Hello World"],
		["level", "info"],
		["timestamp", Date.now()],
	);

	yield* graphService.updateNodeProperties(graph1.id, node1.id, properties);
	yield* Effect.log(`Updated properties for node ${node1.name}`);

	// Get and display node properties
	const retrievedProperties = yield* graphService.getNodeProperties(
		graph1.id,
		node1.id,
	);
	yield* Effect.log(
		`Node properties: ${HashMap.size(retrievedProperties)} properties set`,
	);
	for (const [key, value] of retrievedProperties) {
		yield* Effect.log(`  ${key}: ${value}`);
	}

	// Add an event node to demonstrate the cache
	const eventNodeEvent = yield* graphService.addNode(
		graph1.id,
		new SchemaRef({
			pkgId: PackageId.make("core"),
			schemaId: SchemaId.make("event"),
		}),
		"Event Handler",
	);
	const eventNode = eventNodeEvent.node;
	yield* Effect.log(
		`Added event node: ${eventNode.name} (ID: ${NodeId.make(eventNode.id)})`,
	);

	// Check cache stats
	const cacheStats = yield* runtime.eventNodeCache.getCacheStats();
	yield* Effect.log(
		`Event cache: ${cacheStats.totalEventTypes} event types, ${cacheStats.totalNodes} total nodes`,
	);

	// Test event lookup
	const eventHandlers =
		yield* runtime.eventNodeCache.getNodesForEvent("custom.event");
	yield* Effect.log(
		`Found ${eventHandlers.length} nodes that can handle 'custom.event'`,
	);

	// Create another graph
	const graph2 = yield* graphService.create("Secondary Graph");

	// Rename project
	yield* projectService.rename("My Awesome Project");

	// Get final state
	const finalProject = yield* projectService.get;
	yield* Effect.log(`Final project: ${finalProject.name}`);
	yield* Effect.log(`Total graphs: ${HashMap.size(finalProject.graphs)}`);

	// Create a simple JSON summary of the project
	const projectSummary = yield* Effect.try(() => {
		let totalNodes = 0;
		const graphInfo: string[] = [];

		for (const [graphId, graph] of finalProject.graphs) {
			const nodeCount = HashMap.size(graph.nodes);
			totalNodes += nodeCount;
			graphInfo.push(
				`${graph.name} (ID: ${GraphId.make(graphId)}, Nodes: ${nodeCount})`,
			);
		}

		return JSON.stringify(
			{
				id: ProjectId.make(finalProject.id),
				name: finalProject.name,
				totalGraphs: HashMap.size(finalProject.graphs),
				totalNodes: totalNodes,
				graphs: graphInfo,
				nextGraphId: GraphId.make(finalProject.nextGraphId),
				nextNodeId: NodeId.make(finalProject.nextNodeId),
			},
			null,
			2,
		);
	});
	yield* Effect.log("Project JSON summary:");
	yield* Effect.log(projectSummary);

	// Demonstrate round-trip: parse JSON back and validate with Schema
	yield* Effect.gen(function* () {
		const parsed = JSON.parse(projectSummary);
		yield* Effect.log(`Parsed project name: ${parsed.name}`);
		yield* Effect.log(
			`Parsed project has ${parsed.totalGraphs} graphs and ${parsed.totalNodes} total nodes`,
		);
	});

	yield* Effect.sleep("100 millis");
});

const runnablePlayground = playgroundExample.pipe(
	Effect.provide(PlaygroundLive),
);

// ============================================================================
// Example Usage - Server (Multiple Projects)
// ============================================================================

const serverExample = Effect.gen(function* () {
	const projectService = yield* ProjectService;
	const graphService = yield* GraphService;
	const registry = yield* ProjectRegistry;

	// Create multiple projects
	const proj1Event = yield* registry.create("Project Alpha");
	const proj2Event = yield* registry.create("Project Beta");
	const proj1 = proj1Event.project;
	const proj2 = proj2Event.project;

	yield* Effect.log(`Created projects: ${proj1.id}, ${proj2.id}`);

	// Work within project 1 context
	yield* withProjectRuntime(
		ProjectId.make(proj1.id),
		Effect.gen(function* () {
			const runtime = yield* CurrentRuntime;

			// Subscribe to events for this project
			const eventLogger = pipe(
				Stream.fromQueue(runtime.eventQueue),
				Stream.tap((event) => Effect.log(`EVENT: ${event._tag}`)),
				Stream.runDrain,
			);
			yield* Effect.forkDaemon(eventLogger);

			// ProjectService and GraphService operate on proj1 automatically
			const graphEvent = yield* graphService.create("Main Graph");
			const graph = graphEvent.graph;

			// Add different types of event nodes
			yield* graphService.addNode(
				graph.id,
				new SchemaRef({
					pkgId: PackageId.make("core"),
					schemaId: SchemaId.make("event"),
				}),
				"Custom Event Handler",
			);

			yield* graphService.addNode(
				graph.id,
				new SchemaRef({
					pkgId: PackageId.make("core"),
					schemaId: SchemaId.make("websocket"),
				}),
				"WebSocket Handler",
			);

			yield* projectService.rename("Project Alpha - Updated");

			const project = yield* projectService.get;
			yield* Effect.log(
				`Project 1: ${project.name}, graphs: ${HashMap.size(project.graphs)}`,
			);

			// Check event cache for this project
			const cacheStats = yield* runtime.eventNodeCache.getCacheStats();
			yield* Effect.log(
				`Event cache: ${cacheStats.totalEventTypes} event types, ${cacheStats.totalNodes} total nodes`,
			);

			// Test event lookups
			const customEventHandlers =
				yield* runtime.eventNodeCache.getNodesForEvent("custom.event");
			yield* Effect.log(
				`Found ${customEventHandlers.length} nodes for 'custom.event'`,
			);

			const websocketHandlers =
				yield* runtime.eventNodeCache.getNodesForEvent("websocket.message");
			yield* Effect.log(
				`Found ${websocketHandlers.length} nodes for 'websocket.message'`,
			);
		}),
	);

	// Work within project 2 context
	yield* withProjectRuntime(
		ProjectId.make(proj2.id),
		Effect.gen(function* () {
			const runtime = yield* CurrentRuntime;

			// Subscribe to events for this project
			const eventLogger = pipe(
				Stream.fromQueue(runtime.eventQueue),
				Stream.tap((event) => Effect.log(`EVENT: ${event._tag}`)),
				Stream.runDrain,
			);
			yield* Effect.forkDaemon(eventLogger);

			const graphEvent = yield* graphService.create("Beta Graph");
			const graph = graphEvent.graph;
			yield* graphService.addNode(
				graph.id,
				new SchemaRef({
					pkgId: PackageId.make("core"),
					schemaId: SchemaId.make("http"),
				}),
				"HTTP Handler",
			);

			yield* graphService.addNode(
				graph.id,
				new SchemaRef({
					pkgId: PackageId.make("core"),
					schemaId: SchemaId.make("timer"),
				}),
				"Timer Handler",
			);

			const project = yield* projectService.get;
			yield* Effect.log(
				`Project 2: ${project.name}, graphs: ${HashMap.size(project.graphs)}`,
			);

			// Test event lookups for this project
			const httpHandlers =
				yield* runtime.eventNodeCache.getNodesForEvent("http.request");
			yield* Effect.log(
				`Found ${httpHandlers.length} nodes for 'http.request'`,
			);
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

export {
	// Domain models
	Project,
	Graph,
	Node,
	SchemaRef,
	InputPort,
	OutputPort,
	IOSchema,
	PackageSchema,
	Package,
	NodeIOData,
	// Events
	type ProjectEvent,
	ProjectEventSchema,
	// Individual event classes
	ProjectCreated,
	ProjectDeleted,
	ProjectRenamed,
	GraphAdded,
	GraphDeleted,
	GraphRenamed,
	NodeAdded,
	NodeDeleted,
	NodeUpdated,
	NodePropertiesUpdated,
	// Errors
	type ProjectError,
	ProjectErrorSchema,
	// Individual error classes
	SerializationError,
	DeserializationError,
	ProjectNotFoundError,
	GraphNotFoundError,
	NodeNotFoundError,
	// IO Errors
	PackageNotFoundError,
	SchemaNotFoundError,
	IOCalculationError,
	IOValidationError,
	IONotFoundError,
	// Services
	EventStream,
	ProjectProvider,
	ProjectService,
	GraphService,
	ProjectRegistry,
	PlaygroundOps,
	PackageRegistry,
	IOManager,
	ProjectsRef,
	SingleProjectRef,
	// Helpers
	withProjectRuntime,
	// Layers
	PlaygroundLive,
	ServerLive,
	PlaygroundRuntimeLive,
	ServerRuntimeLive,
	// Examples
	runnablePlayground,
	runnableServer,
};
