import { Effect, Option, RequestResolver } from "effect";
import {
	DataInputRef,
	DataOutputRef,
	ExecInputRef,
	ExecOutputRef,
	Graph,
	IOId,
	Node,
	NodeCreated,
	type PackageMeta,
	type Project,
	type SchemaMeta,
	SchemaNotFound,
	type SchemaRef,
} from "@macrograph/project-domain";

import { Graphs } from "../Graph";
import { type NodeConnections, ProjectData } from "./Data";
import { EventNodeRegistry } from "./EventNodeRegistry";
import { EventsPubSub } from "./EventsPubSub";
import { ProjectPackages } from "./Packages";

export class ProjectRequests extends Effect.Service<ProjectRequests>()(
	"ProjectRequests",
	{
		effect: Effect.gen(function* () {
			const project = yield* ProjectData;
			const packages = yield* ProjectPackages;

			const GetProjectResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (_: Project.GetProject) {
					return {
						name: project.name,
						graphs: (() => {
							const ret: Record<string, Graph.Shape> = {};

							for (const [key, value] of project.graphs.entries()) {
								ret[key] = {
									...value,
									connections: (() => {
										const ret: Graph.Shape["connections"] = {};
										if (!value.connections) return ret;

										for (const [
											key,
											nodeConnections,
										] of value.connections.entries()) {
											if (!nodeConnections.out) continue;
											const outputConns = (ret[key] =
												{} as (typeof ret)[string]);
											for (const [
												key,
												outputConnections,
											] of nodeConnections.out.entries()) {
												outputConns[key] = outputConnections;
											}
										}

										return ret;
									})(),
								};
							}

							return ret;
						})(),
						packages: [...packages.entries()].reduce(
							(acc, [id, { pkg }]) => {
								acc[id] = {
									name: pkg.name,
									schemas: [...pkg.schemas.entries()].reduce(
										(acc, [id, schema]) => {
											acc[id] = { id, name: schema.name, type: schema.type };
											return acc;
										},
										{} as Record<string, SchemaMeta>,
									),
								};
								return acc;
							},
							{} as Record<string, PackageMeta>,
						),
					};
				}),
			);

			const GetPackageSettingsResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (req: Project.GetPackageSettings) {
					const pkg = packages.get(req.package)!;
					return yield* Option.getOrNull(pkg.state)!.get;
				}),
			);

			return { GetProjectResolver, GetPackageSettingsResolver };
		}),
		dependencies: [ProjectPackages.Default],
	},
) {}

export class GraphRequests extends Effect.Service<GraphRequests>()(
	"GraphRequests",
	{
		effect: Effect.gen(function* () {
			const eventNodes = yield* EventNodeRegistry;
			const projectEvents = yield* EventsPubSub;
			const packages = yield* ProjectPackages;
			const project = yield* ProjectData;

			const getNextNodeId = (() => {
				return () => Node.Id.make(++project.nodeIdCounter);
			})();

			const getNode = (graphId: Graph.Id, id: Node.Id) =>
				Option.fromNullable(
					project.graphs.get(graphId)?.nodes.find((n) => n.id === id),
				);

			const getSchema = (schemaRef: SchemaRef) =>
				Option.fromNullable(
					packages.get(schemaRef.pkgId)?.pkg.schemas.get(schemaRef.schemaId),
				);

			const CreateNodeResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (req: Graph.CreateNode) {
					const schema = yield* getSchema(req.schema).pipe(
						Effect.catchTag(
							"NoSuchElementException",
							() => new SchemaNotFound(req.schema),
						),
					);
					const graph = project.graphs.get(req.graphId);
					if (!graph)
						return yield* new Graph.NotFound({ graphId: req.graphId });

					const io: Node.IO = {
						inputs: [],
						outputs: [],
					};

					schema.io({
						out: {
							exec: (id, options) => {
								io.outputs.push({ id, variant: "exec", name: options?.name });
								return new ExecOutputRef(IOId.make(id), options);
							},
							data: (id, type, options) => {
								io.outputs.push({
									id,
									variant: "data",
									data: "string",
									name: options?.name,
								});
								return new DataOutputRef(id, type, options);
							},
						},
						in: {
							exec: (id, options) => {
								io.inputs.push({ id, variant: "exec", name: options?.name });
								return new ExecInputRef(id, options);
							},
							data: (id, type, options) => {
								io.inputs.push({
									id,
									variant: "data",
									data: "string",
									name: options?.name,
								});
								return new DataInputRef(id as IOId, type, options);
							},
						},
					});

					const node: Node.Shape = {
						schema: req.schema,
						id: getNextNodeId(),
						inputs: io.inputs,
						outputs: io.outputs,
						position: { x: req.position[0], y: req.position[1] },
					};

					if (schema.type === "event")
						eventNodes.registerNode(graph.id, node.id, req.schema.pkgId);

					graph.nodes.push(node);

					const event = new NodeCreated({
						nodeId: node.id,
						graphId: graph.id,
						position: node.position,
						schema: req.schema,
						io,
					});

					yield* projectEvents.publish(event);

					return event;
				}),
			);

			const ConnectIOResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* ({
					graphId,
					output,
					input,
				}: Graph.ConnectIO) {
					const graph = project.graphs.get(graphId);
					if (!graph) return yield* new Graph.NotFound({ graphId });
					const connections = (graph.connections ??= new Map() as NonNullable<
						typeof graph.connections
					>);

					if (Option.isNone(getNode(graph.id, output.nodeId)))
						return yield* new Node.NotFound(output);
					if (Option.isNone(getNode(graph.id, input.nodeId)))
						return yield* new Node.NotFound(input);

					const upsertNodeConnections = (nodeId: Node.Id) =>
						connections.get(nodeId) ??
						(() => {
							const v: NodeConnections = {};
							connections.set(nodeId, v);
							return v;
						})();

					const outputNodeConnections = upsertNodeConnections(output.nodeId);

					outputNodeConnections.out ??= new Map();
					const outputNodeInputConnections =
						outputNodeConnections.out.get(output.ioId) ??
						(() => {
							const v: Array<[Node.Id, string]> = [];
							outputNodeConnections.out.set(output.ioId, v);
							return v;
						})();
					outputNodeInputConnections.push([input.nodeId, input.ioId]);

					const inputNodeConnections = upsertNodeConnections(input.nodeId);

					inputNodeConnections.in ??= new Map();
					const inputNodeInputConnections =
						inputNodeConnections.in.get(input.ioId) ??
						(() => {
							const v: Array<[Node.Id, string]> = [];
							inputNodeConnections.in.set(input.ioId, v);
							return v;
						})();
					inputNodeInputConnections.push([output.nodeId, output.ioId]);
				}),
			);

			const DisconnectIOResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* ({ graphId, io }: Graph.DisconnectIO) {
					const graph = project.graphs.get(graphId);
					if (!graph) return yield* new Graph.NotFound({ graphId });
					if (!graph.connections) return;

					const nodeConnections = graph.connections.get(io.nodeId);
					const originConnections =
						io.type === "i" ? nodeConnections?.in : nodeConnections?.out;
					if (!originConnections) return;

					const orginIOConnections = originConnections.get(io.ioId);
					if (!orginIOConnections) return;

					for (const [targetNodeId, targetIOId] of orginIOConnections) {
						const targetNodeConnections = graph.connections.get(targetNodeId);
						const targetConnections =
							io.type === "o"
								? targetNodeConnections?.in
								: targetNodeConnections?.out;
						if (!targetConnections) continue;

						const targetIOConnections = targetConnections.get(targetIOId);
						if (!targetIOConnections) continue;

						const index = targetIOConnections.findIndex(
							([nodeId, ioId]) => ioId === io.ioId && nodeId === io.nodeId,
						);
						if (index !== -1) targetIOConnections.splice(index, 1);
					}

					originConnections.delete(io.ioId);
				}),
			);

			const DeleteSelectionResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (req: Graph.DeleteSelection) {
					const graph = project.graphs.get(req.graph);
					if (!graph) return yield* new Graph.NotFound({ graphId: req.graph });

					for (const nodeId of req.selection) {
						const index = graph.nodes.findIndex((node) => node.id === nodeId);
						if (index === -1) continue;

						const node = graph.nodes[index]!;
						graph.nodes.splice(index, 1);

						eventNodes.unregisterNode(graph.id, node.id, node.schema.pkgId);
					}
				}),
			);

			return {
				CreateNodeResolver,
				ConnectIOResolver,
				DisconnectIOResolver,
				DeleteSelectionResolver,
			};
		}),
		dependencies: [EventsPubSub.Default, EventNodeRegistry.Default],
	},
) {}

export class NodeRequests extends Effect.Service<NodeRequests>()(
	"NodeRequests",
	{
		effect: Effect.gen(function* () {
			const graphs = yield* Graphs;
			// const realtime = yield* RealtimePubSub;
			// const serverPolicy = yield* ServerPolicy;

			const SetNodePositionsResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (payload: Node.SetNodePositions) {
					const graph = yield* graphs
						.get(payload.graphId)
						.pipe(
							Effect.andThen(
								Effect.catchTag(
									"NoSuchElementException",
									() => new Graph.NotFound({ graphId: payload.graphId }),
								),
							),
						);

					const positions: Array<{
						node: Node.Id;
						position: { x: number; y: number };
					}> = [];

					for (const [nodeId, position] of payload.positions) {
						const node = graph.nodes.find((node) => node.id === nodeId);
						if (!node) continue;
						node.position = position;
						positions.push({ node: nodeId, position });
					}

					// yield* realtime.publish({
					// 	type: "NodesMoved",
					// 	graphId: graph.id,
					// 	positions: payload.positions,
					// });
				}),
			);

			return { SetNodePositionsResolver };
		}),
		dependencies: [Graphs.Default],
	},
) {}
