# AGENTS.md - Macrograph Project Guide

## Project Overview

Macrograph is a visual programming platform with node-based graph interfaces. Supports both desktop (single-project) and server (multi-project) environments with real-time event processing and type-safe ID management.

## Documentation Structure

This guide provides essential information for working with Macrograph. For detailed technical documentation, see the `agents/` folder.

### Quick Start
1. Read the **Critical Rules** below (especially #1 about branded types)
2. Check [agents/project-runtime.md](agents/project-runtime.md) for architecture details
3. Review [agents/effect-ts.md](agents/effect-ts.md) for Effect patterns

### Need Help?
- **Branded types**: See rule #1 below
- **Architecture questions**: [agents/project-runtime.md](agents/project-runtime.md)
- **Effect patterns**: [agents/effect-ts.md](agents/effect-ts.md)

## Technology Stack

- **Effect-TS**: Functional programming framework with Effect system, Layer dependency injection, Stream processing, and Schema validation
- **Branded Types**: Type-safe IDs using `Schema.brand()` (ProjectId, GraphId, NodeId, PackageId, SchemaId)
- **Core Libraries**: HashMap (immutable collections), Ref (mutable state), Queue/Stream (event processing)

## Critical Rules for AI Agents

### 1. Branded Type Usage - MANDATORY
**NEVER use `as` type assertions. Always use `.make()` methods:**

```typescript
// ✅ CORRECT
const projectId = ProjectId.make(123);
const packageId = PackageId.make("core");

// ❌ INCORRECT - Never do this
const projectId = 123 as ProjectId;
```

### 2. Effect Patterns
Always work within Effect context:
```typescript
const program = Effect.gen(function* () {
  const projectService = yield* ProjectService;
  return yield* projectService.get();
});
```

### 3. Error Handling
Use Effect's error channels, not try-catch:
```typescript
yield* pipe(
  operation(),
  Effect.catchTag("ProjectNotFoundError", () => Effect.succeed(defaultProject))
);
```

### 4. State Management
Use immutable patterns:
```typescript
yield* Ref.set(runtime.projectRef, Option.some(project));
```

## Architecture

### Core Services
- **ProjectService**: Single project operations
- **GraphService**: Graph and node management
- **ProjectRegistry**: Multi-project coordination
- **PackageRegistry**: Schema package management
- **IOManager**: Node IO calculation and caching
- **EventStream**: Event publishing and subscription

### Key Models
- **Project**: Top-level container with graphs and auto-incrementing IDs
- **Graph**: Container for nodes within a project
- **Node**: Programming units with schema references and properties
- **SchemaRef**: References to package schema definitions

### Runtime Isolation
Each project runs in isolated `ProjectRuntime` with independent state, event queues, and event node caches.

## TypeScript Tooling

### THIS IS VERY IMPORTANT

**Do NOT use TypeScript CLI (`tsc`) or `typecheck` command for type checking.** Use LSP diagnostics instead:
- VS Code or LSP-compatible editors show proper type errors
- Biome handles linting and formatting
- TypeScript CLI fails due to complex Effect-TS types
- **Never run `npm run typecheck` or `tsc` commands**

## Common Patterns

### Create Project
```typescript
const project = yield* registry.create("My Project");
```

### Add Node
```typescript
const node = yield* graphService.addNode(
  graphId,
  new SchemaRef({
    pkgId: PackageId.make("core"),
    schemaId: SchemaId.make("log")
  }),
  "Logger Node"
);
```

### Multi-Project Context
```typescript
yield* withProjectRuntime(
  ProjectId.make(projectId),
  Effect.gen(function* () {
    const graphService = yield* GraphService;
    // Operations within project context
  })
);
```

## Key Principles

1. **Type Safety First**: Branded IDs prevent runtime errors
2. **Effect Everything**: All operations in Effect context
3. **Immutable State**: No direct mutations, use Ref/HashMap
4. **Layered Architecture**: Proper dependency injection
5. **Event-Driven**: React to state changes via events
6. **Error Propagation**: Typed errors with Schema.TaggedError

## Quick Reference

- **ProjectId.make(number)**: Create project ID
- **GraphId.make(number)**: Create graph ID
- **NodeId.make(number)**: Create node ID
- **PackageId.make(string)**: Create package ID
- **SchemaId.make(string)**: Create schema ID

**Never use**: `as ProjectId`, `as GraphId`, `as NodeId`, `as PackageId`, `as SchemaId`
