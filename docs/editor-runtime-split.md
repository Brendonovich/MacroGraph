# Editor / Runtime Split

Macrograph separates concerns into two domains: **Editor** (project structure, metadata, CRUD) and **Runtime** (engine execution, resource values, live state). This split exists in the backend services, the domain event types, and the frontend state management.

## Backend Services

### ProjectEditor (`@macrograph/project-editor`)

Owns the in-memory project state (`Ref<Project>`), package/schema metadata, and the `NodesIOStore`. All structural mutations flow through here.

Provides:
- `project` / `modifyProject` / `loadProject` -- read and mutate the project
- `package` / `packages` / `loadPackage` -- manage loaded packages (without engines)
- `getSchema` -- look up a schema by `SchemaRef`
- `generateNodeIO` -- recompute and publish IO for a node
- `publishEvent` / `subscribe` -- `EditorEvent` pub/sub, events carry an `Actor`

### ProjectRuntime (`@macrograph/project-runtime`)

Manages engine execution. Does **not** hold project state itself -- receives it as `CurrentProject` context during event handling.

Provides:
- `package` / `schema` / `loadPackage` -- error-based lookups (fails with `NotFound`)
- `publishEvent` / `subscribe` -- `RuntimeEvent` pub/sub, always publishes as SYSTEM
- `handleEvent(pkg, event)` -- dispatches a package event to matching event nodes across all graphs

Key difference: Editor uses `Option`-based lookups and requires `Actor` context. Runtime uses error-based lookups and always publishes as SYSTEM.

## Domain Events

Events are split at the type level in `@macrograph/project-domain/src/ProjectEvent.ts`:

### EditorEvent (10 variants)
- `PackageAdded` -- a package was registered
- `GraphCreated` -- a new graph was created
- `GraphItemsMoved` -- nodes/comments repositioned
- `GraphItemsDeleted` -- nodes/comments removed
- `NodeCreated` -- a node added to a graph
- `NodePropertyUpdated` -- a node property value changed
- `NodeIOUpdated` -- node IO ports or connections changed
- `ResourceConstantCreated` / `ResourceConstantUpdated` / `ResourceConstantDeleted`

### RuntimeEvent (2 variants)
- `PackageStateChanged` -- engine state dirtied (triggers settings query invalidation)
- `PackageResourcesUpdated` -- engine resource values changed (e.g. OBS scenes list updated)

`ProjectEditor.publishEvent` accepts only `EditorEvent`. `ProjectRuntime.publishEvent` accepts only `RuntimeEvent`. Each has its own PubSub channel.

## Frontend State (`@macrograph/project-ui`)

### EditorState

SolidJS store holding project structure and package metadata:

```
{
  name: string
  graphs: Record<Graph.Id, GraphState>
  packages: Record<Package.Id, EditorPackageState>
  constants: Record<string, ConstantState>
}
```

`EditorPackageState` contains package name, schemas, and resource **descriptions** (names only -- no values). This is hydrated from `GetProject` and updated by `EditorEventHandler`.

### RuntimeState

SolidJS store holding runtime data from engine instances:

```
{
  packageResources: Record<Package.Id, Record<string, Array<ResourceValue>>>
}
```

Resource **values** (the actual items available for each resource, like OBS scene names or Twitch channel point rewards) live here, updated by `RuntimeEventHandler` when `PackageResourcesUpdated` events arrive.

### Why the split matters for resources

A resource like "OBS Scenes" has two aspects:
- **Description** (name: "Scenes") -- editor metadata, comes from the package definition, available without running any engine
- **Values** (the actual list of scenes) -- runtime data, comes from the running OBS engine instance, changes as scenes are added/removed in OBS

Previously both were combined in `PackageState.resources`. Now they have separate stores with separate lifecycles. The description is available as soon as a package is loaded. The values only appear once the engine is running and can update independently.

### Event Streams

The frontend uses two separate event stream context tags:

- `EditorEventStream` -- carries `EditorEvent` from the backend's editor subscribe
- `RuntimeEventStream` -- carries `RuntimeEvent` from the backend's runtime subscribe

Each has a corresponding handler and layer:
- `EditorEventHandler` + `EditorEventStreamHandlerLive`
- `RuntimeEventHandler` + `RuntimeEventStreamHandlerLive`

### Consumer Wiring

**Playground** (in-process backend): Creates both streams directly from `ProjectEditor.subscribe` and `ProjectRuntime.subscribe`, filtering for SYSTEM actor events.

**Server frontend** (remote backend): Receives a single merged WebSocket realtime stream and splits it by event tag into `EditorEventStream`, `RuntimeEventStream`, and `ServerEventStream`.

### Layer Composition

`ProjectUILayers` composes:
- `EditorState.Default` + `RuntimeState.Default`
- `EditorEventHandler.Default` + `RuntimeEventHandler.Default`
- `EditorEventStreamHandlerLive` + `RuntimeEventStreamHandlerLive`
- `PackageClients.Default` + `ProjectActions.Default`

Consumers provide `EditorEventStream`, `RuntimeEventStream`, `GetPackageRpcClient`, and `ProjectRequestHandler` from outside.

## Component Access Patterns

Most UI components only need `EditorState` (graphs, nodes, schemas, package metadata). Only components that display resource values (like `ConstantsSidebar` for dropdown options) also access `RuntimeState`.

| Component | EditorState | RuntimeState |
|---|---|---|
| GraphsSidebar | graphs | -- |
| GraphView / TabSchema | graphs, packages (schemas) | -- |
| GraphContextMenu | packages (schemas) | -- |
| ContextualSidebar | graphs, packages, constants | -- |
| PackagesSidebar | packages | -- |
| ConstantsSidebar | packages (resource names), constants | packageResources (dropdown values) |
| LayoutState / usePaneTabs | graphs, packages | -- |

## Future Considerations

`RuntimeState` can grow to include:
- Per-package engine state (online/offline, connection status)
- Node execution metrics (run counts, last execution time)
- Live data previews

These would all be runtime concerns that change independently of the project structure.
