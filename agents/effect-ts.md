# Effect-TS Patterns

## Core APIs

- **Context.Tag**: Abstract interfaces with multiple implementations
- **Effect.Service**: Concrete services with single implementation
- **Schema.Class**: Data models with validation/serialization

## Context.Tag vs Effect.Service

### Context.Tag - Multiple Implementations
```typescript
interface ProjectProvider {
  getCurrent(): Effect<Project, ProjectNotFoundError>;
}
const ProjectProvider = Context.Tag<ProjectProvider>("@macrograph/ProjectProvider");

// Single project impl
const SingleProjectProvider = ProjectProvider.of({
  getCurrent: () => Ref.get(projectRef)
});
```

### Effect.Service - Single Implementation
```typescript
class GraphService extends Effect.Service<GraphService>()("@macrograph/GraphService", {
  effect: Effect.gen(function* () {
    const project = yield* ProjectProvider;
    return { /* methods */ };
  }),
  dependencies: [ProjectProvider.Default]
}) {}
```

## Context Requirements

Declare dependencies in Effect's `R` parameter:
```typescript
function doSomething(): Effect<Result, Error, ProjectProvider> {
  return Effect.gen(function* () {
    const provider = yield* ProjectProvider;
  });
}
```

Provide via `Effect.provideService()` or `Effect.provide()`.

## Scoped Services Pattern

For dynamic context (multi-project), create scoped instances vs context tags:

```typescript
function withProject<A, E, R>(
  projectId: number,
  effect: Effect<A, E, R>
): Effect<A, E | ProjectNotFoundError, Exclude<R, ProjectProvider>> {
  return Effect.gen(function* () {
    const projectsRef = yield* ProjectsRef;
    const scopedProvider = {
      getCurrent: () => Effect.gen(function* () {
        const projects = yield* Ref.get(projectsRef);
        return yield* HashMap.get(projects, projectId);
      })
    };
    return yield* Effect.provideService(effect, ProjectProvider, scopedProvider);
  });
}
```

**Benefits**: Clean interfaces, no leaked dependencies, better type safety.

## Anti-Patterns

❌ **Don't leak dependencies**:
```typescript
// Wrong
interface ProjectProvider {
  getCurrent(): Effect<Project, Error, CurrentProjectId>; 
}
// Right
interface ProjectProvider {
  getCurrent(): Effect<Project, Error>;
}
```

❌ **Don't forget context requirements**:
```typescript
// Wrong
function doSomething(): Effect<Result, Error, never> {
  const provider = yield* ProjectProvider; // Error!
}
// Right
function doSomething(): Effect<Result, Error, ProjectProvider> { }
```

## Dependency Strategy

1. **Top-level** (ProjectProvider): Context.Tag
2. **Mid-level** (GraphService): Effect.Service
3. **Leaf operations**: Functions returning Effects

## Testing

```typescript
const MockProvider = ProjectProvider.of({
  getCurrent: () => Effect.succeed(testProject)
});

const result = await Effect.runPromise(
  myFunction().pipe(Effect.provideService(ProjectProvider, MockProvider))
);
```
