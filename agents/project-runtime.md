# ProjectRuntime System Architecture

## Overview

ProjectRuntime is a sophisticated, effect-based architecture for managing visual programming projects with multi-project support, event-driven node execution, and type-safe ID management using Effect-TS.

## Core Components

### Branded ID Types
Type-safe identifiers using `Schema.brand()`:
- `ProjectId`, `GraphId`, `NodeId` (numeric)
- `PackageId`, `SchemaId` (string)

**Usage**: `ProjectId.make(123)` - never use `as` assertions.

### Domain Models
- **Project**: Top-level container with graphs and ID counters
- **Graph**: Container for nodes within a project  
- **Node**: Programming units with schema references and properties
- **SchemaRef**: Reference to package schema definitions

### Event System
Comprehensive event-driven architecture:
- **Project Events**: `ProjectCreated`, `ProjectDeleted`, `ProjectRenamed`
- **Graph Events**: `GraphAdded`, `GraphDeleted`, `GraphRenamed`
- **Node Events**: `NodeAdded`, `NodeDeleted`, `NodeUpdated`, `NodePropertiesUpdated`

All events extend `Schema.TaggedClass` for serialization and type safety.

### Runtime Isolation
**ProjectRuntime**: Isolated container for project state
```typescript
interface ProjectRuntime {
  projectRef: Ref<Option<Project>>;     // Current project state
  eventNodeCache: EventNodeCache;       // Event-to-node mapping
  eventQueue: Queue<ProjectEvent>;        // Runtime-local events
}
```

**EventNodeCache**: Maps event types to nodes that can handle them, automatically rebuilt on structural changes.

## Service Architecture

### ProjectService
Manages single project operations (get, rename) within current runtime context.

### GraphService  
Handles graph operations: create, delete, rename graphs; add, update, delete nodes; manage node properties and IO data.

### ProjectRegistry
Multi-project coordination for server environments: create, list, get, delete projects; manages project runtimes.

### PackageRegistry
Schema package management: register packages, retrieve schemas by ID, validate node configurations.

### IOManager
Node IO calculation and caching: recalculate IO based on properties, cache results, clear on node deletion.

### EventStream
Global event publishing and subscription across all projects.

## Error System

Typed errors using `Schema.TaggedError`:
- **Domain Errors**: `ProjectNotFoundError`, `GraphNotFoundError`, `NodeNotFoundError`
- **IO Errors**: `PackageNotFoundError`, `SchemaNotFoundError`, `IOCalculationError`
- **System Errors**: `SerializationError`, `DeserializationError`

## Layer System

**Dependency Injection** using Effect's Layer system:

**Single Project (Desktop)**:
```typescript
PlaygroundRuntimeLive = Layer.mergeAll(
  SingleProjectRuntimeLive,
  EventStreamLive,
  ProjectServiceLive,
  GraphServiceLive, 
  PackageRegistryLive,
  IOManagerLive
)
```

**Multi Project (Server)**:
```typescript
ServerRuntimeLive = Layer.mergeAll(
  ProjectsRefLive,
  EventStreamLive,
  ProjectRegistryLive,
  ProjectServiceLive,
  GraphServiceLive,
  PackageRegistryLive,
  IOManagerLive
)
```

## Context Switching

**withProjectRuntime**: Switch to specific project context in multi-project environments:
```typescript
yield* withProjectRuntime(
  ProjectId.make(projectId),
  effect // Runs with specified project as current
)
```

## Usage Patterns

### Single Project
```typescript
const program = Effect.gen(function* () {
  const projectService = yield* ProjectService;
  const graphService = yield* GraphService;
  
  const project = yield* projectService.get();
  const graph = yield* graphService.create("Main Graph");
  const node = yield* graphService.addNode(
    graph.id,
    new SchemaRef({
      pkgId: PackageId.make("core"),
      schemaId: SchemaId.make("log")
    }),
    "Logger"
  );
});

yield* Effect.runPromise(program.pipe(Effect.provide(PlaygroundRuntimeLive)));
```

### Multi Project
```typescript
const program = Effect.gen(function* () {
  const registry = yield* ProjectRegistry;
  const proj1 = yield* registry.create("Project Alpha");
  
  yield* withProjectRuntime(
    ProjectId.make(proj1.id),
    Effect.gen(function* () {
      const graphService = yield* GraphService;
      const graph = yield* graphService.create("Main Graph");
      // ... project operations
    })
  );
});

yield* Effect.runPromise(program.pipe(Effect.provide(ServerRuntimeLive)));
```

## Key Benefits

1. **Type Safety**: Branded IDs prevent runtime errors
2. **Isolation**: Runtime isolation prevents cross-project interference  
3. **Event-Driven**: Comprehensive event system for reactive programming
4. **Error Handling**: Typed errors with full serialization support
5. **Scalability**: Multi-project support for server environments
6. **Performance**: Event node caching for efficient event routing

## Event Flow

1. **Node Operations** → **GraphService** → **State Update** → **Event Emission**
2. **Event Emission** → **EventQueue** → **Cache Rebuilding** → **Event Handlers**
3. **External Events** → **EventNodeCache** → **Matching Nodes** → **Node Execution**

The system maintains consistency through transactional state updates and automatic cache rebuilding.