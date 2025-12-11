import { Iterable, pipe, Record } from "effect";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as RequestResolver from "effect/RequestResolver";
import {
	Comment,
	Graph,
	IO,
	Node,
	Package,
	Project,
	ProjectEvent,
	type Request,
	Schema,
} from "@macrograph/project-domain/updated";

import * as Actor from "./Actor";
import { NodeIOActions } from "./NodeIOActions";
import { PackageActions } from "./PackageActions";
import * as ProjectRuntime from "./ProjectRuntime";
import { requestResolverServices } from "./Requests.ts";

export class GraphRequests extends Effect.Service<GraphRequests>()(
	"GraphRequests",
	{
		effect: Effect.gen(function* () {
			const projectActions = yield* PackageActions;
			const nodeIOActions = yield* NodeIOActions;

			const CreateNodeResolver = RequestResolver.fromEffect(
				(r: Request.CreateNode) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;
						const project = yield* Ref.get(runtime.projectRef);
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const schema = yield* projectActions.getSchema(r.schema);

						const nodeId = project.nextNodeId;
						const node = Node.Node.make({
							id: nodeId,
							name: r.name ?? schema.name,
							schema: r.schema,
							position: r.position,
						});

						yield* Ref.set(
							runtime.projectRef,
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

						const io = yield* nodeIOActions.generateNodeIO(schema);
						yield* Ref.update(runtime.nodesIORef, HashMap.set(node.id, io));

						const event = new ProjectEvent.NodeCreated({
							graph: graph.id,
							node,
							io,
						});

						yield* ProjectRuntime.publishEvent(event);

						return event;
					}),
			).pipe(requestResolverServices);

			const SetItemPositionsResolver = RequestResolver.fromEffect(
				(r: Request.SetItemPositions) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;

						if (!r.ephemeral) {
							const project = yield* Ref.get(runtime.projectRef);
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
								(p) => Ref.set(runtime.projectRef, p),
							);

							yield* ProjectRuntime.publishEvent(
								new ProjectEvent.GraphItemsMoved({
									graph: r.graph,
									items: r.items,
								}),
							);
						} else {
							yield* ProjectRuntime.publishEvent(
								new ProjectEvent.GraphItemsMoved({
									graph: r.graph,
									items: r.items,
								}),
							);
						}
					}),
			).pipe(requestResolverServices);

			const DeleteItemsResolver = RequestResolver.fromEffect(
				(r: Request.DeleteGraphItems) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;

						const project = yield* Ref.get(runtime.projectRef);
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
							(p) => Ref.set(runtime.projectRef, p),
						);

						const e = new ProjectEvent.GraphItemsDeleted({
							graph: r.graph,
							items: r.items,
						});

						yield* ProjectRuntime.publishEvent(e);

						return e;
					}),
			).pipe(requestResolverServices);

			const ConnectIOResolver = RequestResolver.fromEffect(
				(r: Request.ConnectIO) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;
						const project = yield* Ref.get(runtime.projectRef);
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

						const connections = HashMap.set(
							graph.connections,
							outNode.id,
							newOutNodeConnections,
						);

						const updated = new Project.Project({
							...project,
							graphs: HashMap.set(
								project.graphs,
								graph.id,
								new Graph.Graph({ ...graph, connections }),
							),
						});

						yield* Ref.set(runtime.projectRef, updated);

						const event = new ProjectEvent.NodeIOUpdated({
							graph: r.graph,
							node: outNode.id,
							outConnections: newOutNodeConnections,
						});

						yield* ProjectRuntime.publishEvent(event);

						return event;
					}),
			).pipe(requestResolverServices);

			const DisconnectIOResolver = RequestResolver.fromEffect(
				(r: Request.DisconnectIO) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;
						const project = yield* Ref.get(runtime.projectRef);
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const outNode = yield* graph.nodes.pipe(
							HashMap.get(r.output.node),
							Effect.catchAll(() => new Node.NotFound({ id: r.output.node })),
						);
						const inNode = yield* graph.nodes.pipe(
							HashMap.get(r.input.node),
							Effect.catchAll(() => new Node.NotFound({ id: r.input.node })),
						);

						const outNodeConnections = HashMap.get(
							graph.connections,
							outNode.id,
						).pipe(Option.getOrUndefined);

						if (!outNodeConnections) return;

						const outConnections = outNodeConnections[r.output.io];
						if (!outConnections) return;
						const filteredConnections = outConnections.filter(
							([inNodeId, inIO]) =>
								inNodeId !== inNode.id && inIO !== r.input.io,
						);

						const newOutNodeConnections =
							filteredConnections.length > 0
								? Record.set(
										outNodeConnections,
										r.output.io,
										filteredConnections,
									)
								: Record.remove(outNodeConnections, r.output.io);

						yield* Ref.set(
							runtime.projectRef,
							new Project.Project({
								...project,
								graphs: HashMap.set(
									project.graphs,
									graph.id,
									new Graph.Graph({
										...graph,
										connections: HashMap.set(
											graph.connections,
											outNode.id,
											newOutNodeConnections,
										),
									}),
								),
							}),
						);

						const event = new ProjectEvent.NodeIOUpdated({
							graph: r.graph,
							node: outNode.id,
							outConnections: newOutNodeConnections,
						});

						yield* ProjectRuntime.publishEvent(event);

						return event;
					}),
			).pipe(requestResolverServices);

			return {
				createNode: Effect.request<
					Request.CreateNode,
					typeof CreateNodeResolver
				>(CreateNodeResolver),

				connectIO: Effect.request<Request.ConnectIO, typeof ConnectIOResolver>(
					ConnectIOResolver,
				),

				setItemPositions: Effect.request<
					Request.SetItemPositions,
					typeof SetItemPositionsResolver
				>(SetItemPositionsResolver),

				deleteItems: Effect.request<
					Request.DeleteGraphItems,
					typeof DeleteItemsResolver
				>(DeleteItemsResolver),

				disconnectIO: Effect.request<
					Request.DisconnectIO,
					typeof DisconnectIOResolver
				>(DisconnectIOResolver),
			};
		}),
		dependencies: [PackageActions.Default, NodeIOActions.Default],
	},
) {}
