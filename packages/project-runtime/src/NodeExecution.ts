import { Array, Effect, HashMap, Iterable, Option, pipe, Record } from "effect";
import {
	ExecOutput,
	type Package as SDKPackage,
	type Schema as SDKSchema,
} from "@macrograph/package-sdk";
import {
	type Credential,
	ExecutionContext,
	Graph,
	type IO,
	Node,
	NodeExecutionContext,
	NodesIOStore,
	type NotComputationNode,
	NotEventNode,
	Package,
	Schema,
} from "@macrograph/project-domain";

import * as ProjectRuntime from "./ProjectRuntime.ts";

export class NodeExecution extends Effect.Service<NodeExecution>()(
	"NodeExecution",
	{
		effect: Effect.sync(() => {
			const collectNodeProperties = Effect.fnUntraced(function* (
				pkg: SDKPackage.Any,
				node: Node.Node,
				schema: SDKSchema.Any,
			) {
				const project = yield* ProjectRuntime.CurrentProject;

				const properties: Record<string, any> = {};
				// const engineResources = pkg.engine.pipe(
				// 	Option.getOrUndefined,
				// )?.resources;
				for (const [id, def] of Object.entries(schema.properties ?? {})) {
					// if (!engineResources) continue;
					// const resource = yield* def.resource.tag.pipe(
					// 	Effect.provide(engineResources),
					// );
					// if (!resource) {
					// 	yield* Effect.log(`Resource '${pkg}/${def.resource.id}' not found`);
					// 	return yield* new Schema.InvalidPropertyValue({
					// 		property: def.name,
					// 	});
					// }

					// const constantId = node.properties?.pipe(
					// 	HashMap.get(id),
					// 	Option.getOrUndefined,
					// ) as string | undefined;

					// if (constantId === undefined) {
					// 	yield* Effect.log(`Constant '${id}' not found`);
					// 	return yield* new Schema.InvalidPropertyValue({
					// 		property: def.name,
					// 	});
					// }

					// const constantValue = project.constants.pipe(
					// 	HashMap.get(constantId),
					// 	Option.map((c) => c.value),
					// 	Option.getOrUndefined,
					// );

					// if (constantValue === undefined) {
					// 	yield* Effect.log(`Constant '${constantId}' not found`);
					// 	return yield* new Schema.InvalidPropertyValue({
					// 		property: def.name,
					// 	});
					// }

					// const values = yield* resource.get;

					// const value = values.find(
					// 	(v) => def.resource.serialize(v).id === constantValue,
					// );
					// if (!value) {
					// 	yield* Effect.log(
					// 		`No value for resource '${pkg}/${def.resource.id}' found`,
					// 	);
					// 	return yield* new Schema.InvalidPropertyValue({
					// 		property: def.name,
					// 	});
					// }
					properties[id] = null; // value;
				}

				return properties;
			});

			const resolveExecConnection = Effect.fnUntraced(function* (
				graph: Graph.Graph,
				node: Node.Node,
				output: ExecOutput,
			) {
				const runtime = yield* ProjectRuntime.ProjectRuntime_;

				const [connection] = yield* HashMap.get(
					graph.connections,
					node.id,
				).pipe(Effect.flatMap((v) => Option.fromNullable(v[output.id as any])));

				return yield* Option.fromNullable(connection).pipe(
					Option.flatMap((conn) => HashMap.get(graph.nodes, conn[0])),
					Option.map(
						Effect.fnUntraced(function* (node) {
							const schema = yield* (yield* runtime.package(
								node.schema.pkg,
							)).pipe(
								Effect.catchTag(
									"NoSuchElementException",
									() => new Package.NotFound({ id: node.schema.pkg }),
								),
								Effect.flatMap((pkg) =>
									Option.fromNullable(pkg.schemas.get(node.schema.id)),
								),
								Effect.catchTag(
									"NoSuchElementException",
									() => new Schema.NotFound(node.schema),
								),
							);

							if (schema.type === "pure" || schema.type === "event")
								return yield* new Node.NotExecutable();

							return node;
						}),
					),
					Effect.transposeOption,
				);
			});

			const getSchema = Effect.fnUntraced(function* (ref: Schema.Ref) {
				const runtime = yield* ProjectRuntime.ProjectRuntime_;

				return yield* (yield* runtime.package(ref.pkg)).pipe(
					Effect.catchTag(
						"NoSuchElementException",
						() => new Package.NotFound({ id: ref.pkg }),
					),
					Effect.flatMap((p) =>
						Option.fromNullable(p.schemas.get(ref.id)).pipe(
							Option.map((s) => [p, s] as const),
						),
					),
					Effect.catchTag(
						"NoSuchElementException",
						() => new Schema.NotFound(ref),
					),
				);
			});

			const getNodeIO = Effect.fnUntraced(function* (id: Node.Id) {
				const nodesIO = yield* NodesIOStore;

				return yield* nodesIO.getForNode(id).pipe(
					Effect.flatten,
					Effect.catchTag(
						"NoSuchElementException",
						() => new Node.NotFound({ id }),
					),
				);
			});

			const processNodeInputs: (
				node: Node.Node,
			) => Effect.Effect<
				void,
				| Schema.NotFound
				| Node.NotFound
				| Package.NotFound
				| Schema.InvalidPropertyValue
				| Credential.FetchFailed
				| NotComputationNode,
				| ProjectRuntime.ProjectRuntime_
				| ExecutionContext
				| NodesIOStore
				| ProjectRuntime.CurrentProject
			> = Effect.fnUntraced(function* (node: Node.Node) {
				const { graph } = yield* ExecutionContext;

				const io = yield* getNodeIO(node.id);
				for (const input of io.inputs) {
					const [connection] = pipe(
						graph.connections,
						HashMap.entries,
						Iterable.flatMap(([outNodeId, conns]) =>
							pipe(
								conns,
								Record.toEntries,
								Iterable.flatMap(([outId, conns]) =>
									pipe(
										conns,
										Iterable.filterMap(([inNodeId, inId]) => {
											// TODO: Fix type
											if (inNodeId === node.id && inId === (input.id as any))
												return Option.some([outNodeId, outId] as const);
											return Option.none();
										}),
									),
								),
							),
						),
						Array.fromIterable,
					);
					if (!connection) continue;

					const connectedNode = HashMap.get(graph.nodes, connection[0]);
					if (Option.isNone(connectedNode)) {
						yield* Effect.log(`Node ${connection[0]} not found`);
						return;
					}

					const [pkg, schema] = yield* getSchema(connectedNode.value.schema);
					if (schema.type === "pure") {
						yield* runNode(connectedNode.value, pkg, schema);
					}
				}
			});

			const runNode = Effect.fnUntraced(function* (
				node: Node.Node,
				pkg: SDKPackage.Any,
				schema: Exclude<SDKSchema.Any, { type: "event" }>,
			) {
				yield* Effect.log(`running node ${node.id}`);
				const io = yield* getNodeIO(node.id);
				const properties = yield* collectNodeProperties(pkg, node, schema);

				yield* processNodeInputs(node);

				const run =
					schema.type === "pure"
						? Effect.sync(() => schema.run({ io: io.shape, properties }))
						: Effect.fn(schema.run)({ io: io.shape, properties });

				return yield* run.pipe(
					Effect.provideService(NodeExecutionContext, {
						node: { id: node.id },
					}),
				);
			});

			const fireEventNode = Effect.fn(function* (
				graphId: Graph.Id,
				nodeId: Node.Id,
				event: any,
			) {
				const project = yield* ProjectRuntime.CurrentProject;

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

				const [pkg, schema] = yield* getSchema(node.schema);

				if (schema.type !== "event") return yield* new NotEventNode();

				const io = yield* getNodeIO(node.id);
				const properties = yield* collectNodeProperties(pkg, node, schema);

				const eventData = schema.event({ properties }, event);
				if (eventData === undefined) return false;

				const outputData = new Map<Node.Id, Map<string, any>>();

				const execCtx = ExecutionContext.context({
					traceId: Math.random().toString(),
					// getInput: Effect.fn(
					// 	function* (input) {
					// 		const { node } = yield* NodeExecutionContext;

					// 		const [connection] = pipe(
					// 			graph.connections,
					// 			HashMap.entries,
					// 			Iterable.flatMap(([outNodeId, conns]) =>
					// 				pipe(
					// 					conns,
					// 					Record.toEntries,
					// 					Iterable.flatMap(([outId, conns]) =>
					// 						pipe(
					// 							conns,
					// 							Iterable.filterMap(([inNodeId, inId]) => {
					// 								// TODO: Fix type
					// 								if (
					// 									inNodeId === node.id &&
					// 									inId === (input.id as any)
					// 								)
					// 									return Option.some([outNodeId, outId] as const);
					// 								return Option.none();
					// 							}),
					// 						),
					// 					),
					// 				),
					// 			),
					// 			Array.fromIterable,
					// 		);

					// 		if (connection) {
					// 			return outputData.get(connection[0])?.get(connection[1]);
					// 		} else {
					// 			return yield* Effect.die("TODO");
					// 		}
					// 	},
					// 	Effect.provideService(ProjectRuntime.Current, runtime),
					// ),
					// setOutput: Effect.fn(function* (output, data) {
					// 	const { node } = yield* NodeExecutionContext;
					// 	const outMap = outputData.get(node.id) ?? new Map();
					// 	outMap.set(output.id, data);
					// 	outputData.set(node.id, outMap);
					// }),
					graph,
				});

				yield* Effect.log("running event node");

				yield* Effect.gen(function* () {
					let nextOutput = yield* Effect.sync(() =>
						schema.run({ io: io.shape, event }),
					).pipe(
						Effect.map((v) =>
							Option.fromNullable(v).pipe(
								Option.filterMap((v: any) => {
									if (v instanceof ExecOutput) return Option.some(v);
									return Option.none();
								}),
								Option.map((v) => [node, v] as const),
							),
						),
						Effect.provideService(NodeExecutionContext, {
							node: { id: node.id },
						}),
					);

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

						nextOutput = yield* runNode(nextNode.value, pkg, schema).pipe(
							Effect.map((v) =>
								Option.fromNullable(v).pipe(
									Option.filterMap((v: any) => {
										if (v instanceof ExecOutput) return Option.some(v);
										return Option.none();
									}),
									Option.map((v) => [nextNode.value, v] as const),
								),
							),
						);
					}
				}).pipe(Effect.provide(execCtx));
			});

			return { fireEventNode };
		}),
	},
) {}
