# MacroGraph - Node-based visual programming

- Written in TypeScript with Effect
	- Modern Effect patterns must be used, such as Effect.Service
- State is organised into Projects
- Projects contain Graphs which contain Nodes
- Nodes don't do anything, they are just data that reference Schemas
- Schemas are provided by Packages which are installed at runtime
- Packages can integrate with third-party services to produce Events
- Schemas contain functions which determine what IO a given Node has, and what the Node actually does
- Schemas can have the types Event, Exec, or Pure
- Nodes that have Event schemas are the only nodes which can start execution, as all node chains require an event for them to be started
- Event schemas have an additional function to filter events from their corresponding package, which determines whether an event should fire the node or not.

## State

This state is the source of truth for the application.
It is held in memory, and serialized for storage.

```ts
class Project extends Schema.Class<Project>("Project")({
	name: Schema.String,
	graphs: Schema.Map({ key: Schema.Int, value: Graph })
}) {}

class Graph extends Schema.Class<Graph>("Graph")({
	id: Schema.Int,
	name: Schema.String,
	nodes: Schema.Map({ key: Schema.Int, value: Node })
}) {}

class Node extends Schema.Class<Node>("Node")({
	id: Schema.int,
	name: Schema.String,
	schema: SchemaRef
}) {}

class SchemaRef extends Schema.Class<SchemaRef>("SchemaRef")({
	pkgId: Schema.String,
	schemaId: Schema.String,
}) {}
```

## Runtime

TODO. A plethora of Services will likely be needed that fulfil the following functions:
- ProjectService: Functions for modifying a singular project. Each function should depend on `ProjectProvider`
- ProjectProvider: Provides a `Ref<Project>`. Implementation of this will depend on the environment (`SingleProjectProvider` for playgrounds, `MultiProjectProvider` for servers)
- ProjectEventStream: Provides a stream that `ProjectService` can publish modification events to. A separate stream per project is expected
