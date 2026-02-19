import { Effect, HashMap, Option } from "effect";
import {
	type DataInput,
	type DataOutput,
	ExecOutput,
	type Package as SDKPackage,
	type Schema as SDKSchema,
} from "@macrograph/package-sdk";
import {
	ExecutionContext,
	Graph,
	IO,
	Node,
	type NodesIOStore,
	NotEventNode,
	Package,
	type Project,
	Schema,
} from "@macrograph/project-domain";

import { EngineRegistry } from "./EngineRegistry.ts";
import {
	buildConnectionIndex,
	makeExecStepInputResolver,
	makeInMemoryOutputStore,
	runNode,
} from "./NodeExecutionInternals.ts";
import { ProjectRuntime } from "./ProjectRuntime.ts";

export const getSchema = Effect.fnUntraced(function* (ref: Schema.Ref) {
	const runtime = yield* ProjectRuntime.ProjectRuntime;
	const pkg = yield* runtime.package(ref.pkg);
	const schema = yield* runtime.schema(ref);
	const result: readonly [SDKPackage.Any, SDKSchema.Any] = [pkg, schema];
	return result;
});

export const fireEventNode = Effect.fn("fireEventNode")(function* (
	project: Project.Project,
	graphId: Graph.Id,
	nodeId: Node.Id,
	event: any,
) {
	const runtime = yield* ProjectRuntime.ProjectRuntime;

	const [graph, node] = yield* HashMap.get(project.graphs, graphId).pipe(
		Effect.catchTag(
			"NoSuchElementException",
			() => new Graph.NotFound({ id: graphId }),
		),
		Effect.flatMap((graph) =>
			HashMap.get(graph.nodes, nodeId).pipe(
				Option.map((n) => [graph, n] as const),
			),
		),
		Effect.catchTag(
			"NoSuchElementException",
			() => new Node.NotFound({ id: nodeId }),
		),
	);

	const pkg = yield* runtime.package(node.schema.pkg);
	const schema = yield* runtime.schema(node.schema);

	if (schema.type !== "event") return yield* new NotEventNode();

	const connectionIndex = buildConnectionIndex(graph.connections);
	const execOutputs = makeInMemoryOutputStore();
	const makeDefaultInputValue =
		(node: Node.Node) =>
		(i: DataInput<any>): Effect.Effect<unknown> => {
			const stored = node.inputDefaults?.pipe(
				HashMap.get(IO.Id.make(i.id)),
				Option.getOrUndefined,
			);
			if (stored !== undefined) return Effect.succeed(stored);
			if (i.type._tag === "String") return Effect.succeed("");
			return Effect.die(`TODO: implement default value for ${i.type._tag}`);
		};
	const toExecOutput = (value: unknown) =>
		value instanceof ExecOutput ? Option.some(value) : Option.none();
	const defaultExecOutputId = "exec";
	const defaultExecOutputForNode = (nodeId: Node.Id) =>
		HashMap.get(graph.connections, nodeId).pipe(
			Option.filter((outputs) => defaultExecOutputId in outputs),
			Option.map(() => new ExecOutput({ id: defaultExecOutputId })),
		);
	const toExecOutputForNode = (node: Node.Node, value: unknown) =>
		Option.fromNullable(value).pipe(
			Option.filterMap(toExecOutput),
			Option.orElse(() => defaultExecOutputForNode(node.id)),
			Option.map((v) => [node, v] as const),
		);
	const getNodeOrFail = (id: Node.Id) =>
		HashMap.get(graph.nodes, id).pipe(
			Effect.catchTag(
				"NoSuchElementException",
				() => new Node.NotFound({ id }),
			),
		);

	const { shape: eventShape, properties } = yield* getNodeExecutionData(
		node,
		pkg,
		schema,
	);

	const eventData = schema.event(event, { properties });
	if (Option.isNone(eventData)) return false;

	const execCtx = ExecutionContext.context({
		traceId: Math.random().toString(),
		graph,
	});

	yield* Effect.gen(function* () {
		let nextOutput = yield* runNode({
			nodeId: node.id,
			shape: eventShape,
			properties,
			getInput: makeDefaultInputValue(node),
			setOutput: (out, value) => execOutputs.set(node.id, out.id, value),
			run: ({ io }) =>
				Effect.sync(() => schema.run({ io, event: eventData.value })),
		}).pipe(Effect.map((v) => toExecOutputForNode(node, v)));

		while (Option.isSome(nextOutput)) {
			const nextNode = yield* resolveExecConnection(
				graph,
				nextOutput.value[0],
				nextOutput.value[1],
			);

			if (Option.isNone(nextNode)) break;

			const [pkg, schema] = yield* getSchema(nextNode.value.schema);

			if (schema.type === "event" || schema.type === "pure")
				return yield* new Node.NotExecutable();

			const stepResolver = makeExecStepInputResolver<
				| Schema.NotFound
				| Schema.InvalidPropertyValue
				| Node.NotFound
				| Package.NotFound,
				| NodesIOStore
				| ProjectRuntime.CurrentProject
				| ProjectRuntime.ProjectRuntime
				| ExecutionContext
				| EngineRegistry.EngineRegistry
			>({
				currentNodeId: nextNode.value.id,
				connectionIndex,
				isPureNode: (nodeId) =>
					Effect.gen(function* () {
						const node = yield* getNodeOrFail(nodeId);
						const [, schema] = yield* getSchema(node.schema).pipe(
							Effect.provideService(ProjectRuntime.ProjectRuntime, runtime),
						);
						return schema.type === "pure";
					}),
				evaluatePureNode: ({ nodeId, getInput, setOutput }) =>
					Effect.gen(function* () {
						const node = yield* getNodeOrFail(nodeId);
						const [pkg, schema] = yield* getSchema(node.schema).pipe(
							Effect.provideService(ProjectRuntime.ProjectRuntime, runtime),
						);

						if (schema.type !== "pure") return;

						const { shape, properties } = yield* getNodeExecutionData(
							node,
							pkg,
							schema,
						);

						yield* runNode({
							nodeId: node.id,
							shape,
							properties,
							getInput,
							setOutput,
							run: ({ io, properties }) =>
								runSchemaNode(schema, io, properties),
						});
					}),
				execOutputs,
				defaultValue: makeDefaultInputValue(nextNode.value),
			});

			const { shape, properties } = yield* getNodeExecutionData(
				nextNode.value,
				pkg,
				schema,
			);
			nextOutput = yield* runNode({
				nodeId: nextNode.value.id,
				shape,
				properties,
				getInput: stepResolver.getInput,
				setOutput: (out: DataOutput, value: unknown) =>
					execOutputs.set(nextNode.value.id, out.id, value),
				run: ({ io, properties }) => runSchemaNode(schema, io, properties),
			}).pipe(Effect.map((v) => toExecOutputForNode(nextNode.value, v)));
		}
	}).pipe(
		Effect.provide(execCtx),
		Effect.catchAll((e) => Effect.logError(e)),
		Effect.catchAllDefect((e) => Effect.logError(String(e))),
	);
});

const collectNodeProperties = Effect.fnUntraced(function* (
	pkg: SDKPackage.Any,
	node: Node.Node,
	schema: SDKSchema.Any,
) {
	const project = yield* ProjectRuntime.CurrentProject;
	const runtime = yield* ProjectRuntime.ProjectRuntime;

	const properties: Record<string, any> = {};

	for (const [id, def] of Object.entries(schema.properties ?? {})) {
		if ("resource" in def) {
			const constantId = node.properties?.pipe(
				HashMap.get(id),
				Option.getOrUndefined,
			);
			if (typeof constantId !== "string") {
				return yield* new Schema.InvalidPropertyValue({ property: def.name });
			}

			const constant = project.constants.pipe(
				HashMap.get(constantId),
				Option.getOrUndefined,
			);
			if (!constant || constant.type !== "resource") {
				return yield* new Schema.InvalidPropertyValue({ property: def.name });
			}
			if (
				constant.pkg !== node.schema.pkg ||
				constant.resource !== def.resource.id
			) {
				return yield* new Schema.InvalidPropertyValue({ property: def.name });
			}
			if (!constant.value) {
				return yield* new Schema.InvalidPropertyValue({ property: def.name });
			}

			const { engines } = yield* EngineRegistry.EngineRegistry;
			const engine = engines.get(node.schema.pkg);
			if (!engine) {
				return yield* new Package.NotFound({ id: node.schema.pkg });
			}

			properties[id] = { engine: engine.runtime, value: constant.value };
			continue;
		}

		if ("type" in def) {
			properties[id] = node.properties?.pipe(
				HashMap.get(id),
				Option.getOrUndefined,
			);
		}
	}

	return properties;
});

const resolveExecConnection = Effect.fnUntraced(function* (
	graph: Graph.Graph,
	node: Node.Node,
	output: ExecOutput,
) {
	const runtime = yield* ProjectRuntime.ProjectRuntime;

	const connection = HashMap.get(graph.connections, node.id).pipe(
		Option.flatMap((outputs) => Option.fromNullable(outputs[output.id as any])),
		Option.flatMap((conns) => Option.fromNullable(conns[0])),
	);

	return yield* connection.pipe(
		Option.flatMap((conn) => HashMap.get(graph.nodes, conn[0])),
		Option.map(
			Effect.fnUntraced(function* (node) {
				const schema = yield* runtime.schema(node.schema);

				if (schema.type === "pure" || schema.type === "event")
					return yield* new Node.NotExecutable();

				return node;
			}),
		),
		Effect.transposeOption,
	);
});

const getNodeExecutionData = Effect.fnUntraced(function* (
	node: Node.Node,
	pkg: SDKPackage.Any,
	schema: SDKSchema.Any,
) {
	const { shape } = yield* IO.generateNodeIO(schema, node);
	const properties = yield* collectNodeProperties(pkg, node, schema);
	return { shape, properties };
});

const runSchemaNode = (
	schema: Exclude<SDKSchema.Any, { type: "event" }>,
	io: any,
	properties: any,
) => {
	if (schema.type === "pure")
		return Effect.sync(() => schema.run({ io, properties }));
	return schema.run({ io, properties });
};

export class NodeExecution extends Effect.Service<NodeExecution>()(
	"NodeExecution",
	{ effect: Effect.succeed({ fireEventNode, getSchema }) },
) {}
