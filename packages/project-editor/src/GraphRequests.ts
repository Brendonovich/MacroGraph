import { Iterable, pipe, Record } from "effect";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as RequestResolver from "effect/RequestResolver";
import {
	Comment,
	Graph,
	IO,
	Node,
	NodesIOStore,
	Project,
	ProjectEvent,
	type Request,
	Schema,
} from "@macrograph/project-domain";

import { ProjectEditor } from "./ProjectEditor.ts";
import { requestResolverServices } from "./Requests.ts";

export class GraphRequests extends Effect.Service<GraphRequests>()(
	"GraphRequests",
	{
		effect: Effect.gen(function* () {
			const CreateNodeResolver = RequestResolver.fromEffect(
				(r: Request.CreateNode) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;
						const nodesIO = yield* NodesIOStore;

						const project = yield* editor.project;
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const schema = yield* editor.getSchema(r.schema).pipe(
							Effect.flatten,
							Effect.catchTag(
								"NoSuchElementException",
								() => new Schema.NotFound(r.schema),
							),
						);

						const nodeId = project.nextNodeId;
						const node = Node.Node.make({
							id: nodeId,
							name: r.name ?? schema.name,
							schema: r.schema,
							position: r.position,
						});

						yield* editor.modifyProject(
							() =>
								new Project.Project({
									...project,
									graphs: HashMap.set(
										project.graphs,
										graph.id,
										new Graph.Graph({
											...graph,
											nodes: HashMap.set(graph.nodes, nodeId, node),
										}),
									),
									nextNodeId: Node.Id.make(nodeId + 1),
								}),
						);

						const io = yield* IO.generateNodeIO(schema, node);
						yield* nodesIO.setForNode(node.id, io);

						return yield* editor.publishEvent(
							new ProjectEvent.NodeCreated({
								graph: graph.id,
								node,
								io: {
									inputs: io.inputs.map((i) => i[0]),
									outputs: io.outputs.map((o) => o[0]),
								},
							}),
						);
					}),
			).pipe(requestResolverServices);

			const SetItemPositionsResolver = RequestResolver.fromEffect(
				(r: Request.SetItemPositions) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;

						if (!r.ephemeral) {
							const project = yield* editor.project;
							const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
								Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
							);

							yield* pipe(
								new Graph.Graph({
									...graph,
									nodes: pipe(
										r.items,
										Iterable.filterMap(([variant, position]) => {
											if (variant[0] === "Node")
												return Option.some([variant[1], position] as const);
											return Option.none();
										}),
										Iterable.reduce(graph.nodes, (map, [id, position]) =>
											HashMap.modify(map, id, (n) =>
												Node.Node.make({ ...n, position }),
											),
										),
									),
									comments: pipe(
										r.items,
										Iterable.filterMap(([variant, position]) => {
											if (variant[0] === "Comment")
												return Option.some([variant[1], position] as const);
											return Option.none();
										}),
										Iterable.reduce(graph.comments, (map, [id, position]) =>
											HashMap.modify(
												map,
												id,
												(c) => new Comment.Comment({ ...c, position }),
											),
										),
									),
								}),
								(graph) => HashMap.set(project.graphs, r.graph, graph),
								(graphs) => new Project.Project({ ...project, graphs }),
								(p) => editor.modifyProject(() => p),
							);
						}

						yield* editor.publishEvent(
							new ProjectEvent.GraphItemsMoved({
								graph: r.graph,
								items: r.items,
							}),
						);
					}),
			).pipe(requestResolverServices);

			const DeleteGraphItemsResolver = RequestResolver.fromEffect(
				(r: Request.DeleteGraphItems) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;

						const project = yield* editor.project;
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const nodes = HashMap.removeMany(
							graph.nodes,
							Iterable.filterMap(r.items, (item) =>
								item[0] === "Node" ? Option.some(item[1]) : Option.none(),
							),
						);

						yield* pipe(
							new Graph.Graph({ ...graph, nodes }),
							(graph) => HashMap.set(project.graphs, r.graph, graph),
							(graphs) => new Project.Project({ ...project, graphs }),
							(p) => editor.modifyProject(() => p),
						);

						return yield* editor.publishEvent(
							new ProjectEvent.GraphItemsDeleted({
								graph: r.graph,
								items: r.items,
							}),
						);
					}),
			).pipe(requestResolverServices);

			const ConnectIOResolver = RequestResolver.fromEffect(
				(r: Request.ConnectIO) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;

						const project = yield* editor.project;
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const outNode = yield* graph.nodes.pipe(
							HashMap.get(r.output[0]),
							Effect.catchAll(() => new Node.NotFound({ id: r.output[0] })),
						);
						yield* graph.nodes.pipe(
							HashMap.get(r.input[0]),
							Effect.catchAll(() => new Node.NotFound({ id: r.input[0] })),
						);

						const outNodeConnections =
							HashMap.get(graph.connections, outNode.id).pipe(
								Option.getOrUndefined,
							) ?? {};

						const outConnections = outNodeConnections[r.output[1]] ?? [];

						const newOutNodeConnections = {
							...outNodeConnections,
							[r.output[1]]: [...outConnections, r.input],
						};

						yield* pipe(
							graph.connections,
							HashMap.set(outNode.id, newOutNodeConnections),
							(connections) =>
								new Project.Project({
									...project,
									graphs: HashMap.set(
										project.graphs,
										graph.id,
										new Graph.Graph({ ...graph, connections }),
									),
								}),
							(p) => editor.modifyProject(() => p),
						);

						return yield* editor.publishEvent(
							new ProjectEvent.NodeIOUpdated({
								graph: r.graph,
								node: outNode.id,
								outConnections: newOutNodeConnections,
							}),
						);
					}),
			).pipe(requestResolverServices);

			const DisconnectIOResolver = RequestResolver.fromEffect(
				(r: Request.DisconnectIO) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;
						let project = yield* editor.project;
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						// Group requested disconnections by output node so we can compute
						// and persist each output node's updated connection map in one pass.
						const byOutNode = new Map<
							Node.Id,
							Array<{ outIo: IO.Id; inNode: Node.Id; inIo: IO.Id }>
						>();
						for (const conn of r.connections) {
							const outNode = yield* HashMap.get(
								graph.nodes,
								conn.output.node,
							).pipe(
								Effect.catchAll(
									() => new Node.NotFound({ id: conn.output.node }),
								),
							);
							const inNode = yield* HashMap.get(
								graph.nodes,
								conn.input.node,
							).pipe(
								Effect.catchAll(
									() => new Node.NotFound({ id: conn.input.node }),
								),
							);
							const entry = byOutNode.get(outNode.id) ?? [];
							entry.push({
								outIo: conn.output.io,
								inNode: inNode.id,
								inIo: conn.input.io,
							});
							byOutNode.set(outNode.id, entry);
						}

						const events: ProjectEvent.NodeIOUpdated[] = [];

						for (const [outNodeId, removals] of byOutNode) {
							const outNodeConnections = HashMap.get(
								graph.connections,
								outNodeId,
							).pipe(Option.getOrUndefined);

							if (!outNodeConnections) continue;

							// Apply all removals for this output node at once.
							let newOutNodeConnections = outNodeConnections;
							for (const { outIo, inNode, inIo } of removals) {
								const outConns = newOutNodeConnections[outIo];
								if (!outConns) continue;
								const filtered = outConns.filter(
									([inNodeId, inIO]) => inNodeId !== inNode || inIO !== inIo,
								);
								newOutNodeConnections =
									filtered.length > 0
										? Record.set(newOutNodeConnections, outIo, filtered)
										: Record.remove(newOutNodeConnections, outIo);
							}

							project = new Project.Project({
								...project,
								graphs: HashMap.set(
									project.graphs,
									graph.id,
									new Graph.Graph({
										...graph,
										connections: HashMap.set(
											graph.connections,
											outNodeId,
											newOutNodeConnections,
										),
									}),
								),
							});

							yield* editor.modifyProject(() => project);

							const event = yield* editor.publishEvent(
								new ProjectEvent.NodeIOUpdated({
									graph: r.graph,
									node: outNodeId,
									outConnections: newOutNodeConnections,
								}),
							);
							events.push(event);
						}

						return events;
					}),
			).pipe(requestResolverServices);

			return {
				CreateNodeResolver,
				ConnectIOResolver,
				SetItemPositionsResolver,
				DeleteGraphItemsResolver,
				DisconnectIOResolver,
			};
		}),
		dependencies: [NodesIOStore.Default],
	},
) {}
