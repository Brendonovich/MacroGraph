import {
	Effect,
	type Request as ERequest,
	HashMap,
	Iterable,
	Record,
} from "effect";
import type { DeepMutable, Mutable } from "effect/Types";
import type {
	Graph,
	IO,
	Node,
	Package,
	Position,
	Request,
	Schema,
} from "@macrograph/project-domain/updated";
import { createStore, reconcile } from "solid-js/store";

import type { GraphTwoWayConnections } from "./Graph";

export type NodeState = {
	id: Node.Id;
	name: string;
	schema: Schema.Ref;
	properties?: Record<string, unknown>;
	position: Position;
} & Mutable<IO.NodeIO>;

export type GraphState = Omit<Graph.Graph, "connections" | "nodes"> & {
	nodes: Array<NodeState>;
	connections: GraphTwoWayConnections;
};

export class ProjectState extends Effect.Service<ProjectState>()(
	"ProjectState",
	{
		effect: Effect.gen(function* () {
			const [state, setState] = createStore<{
				name: string;
				graphs: Record<Graph.Id, GraphState>;
				packages: Record<string, Package.Package>;
			}>({
				name: "New Project",
				graphs: {},
				packages: {},
			});

			const actions = {
				disconnectIO(
					prev: typeof state,
					args: {
						graphId: Graph.Id;
						nodeId: Node.Id;
						type: "i" | "o";
						ioId: IO.Id;
					},
				) {
					const graph = prev.graphs[args.graphId];
					if (!graph) return;

					const ioConnections =
						graph.connections[args.nodeId]?.[args.type === "i" ? "in" : "out"];
					if (!ioConnections) return;

					const connections = ioConnections[args.ioId];
					if (!connections) return;
					delete ioConnections[args.ioId];

					for (const [oppNodeId, oppIoId] of connections) {
						const oppNodeConnections = graph.connections[oppNodeId];
						const oppConnections =
							oppNodeConnections?.[args.type === "o" ? "in" : "out"]?.[oppIoId];
						if (!oppConnections) continue;

						const index = oppConnections.findIndex(
							([nodeId, ioId]) => nodeId === args.nodeId && ioId === args.ioId,
						);
						if (index !== -1) oppConnections.splice(index, 1);
					}
				},
				deleteNode(
					prev: typeof state,
					args: {
						graph: Graph.Id;
						nodeId: Node.Id;
					},
				) {
					const graph = prev.graphs[args.graph];
					if (!graph) return;

					const nodeConnections = graph.connections[args.nodeId];

					if (nodeConnections?.in)
						for (const ioId of Record.keys(nodeConnections.in)) {
							actions.disconnectIO(prev, {
								graphId: args.graph,
								nodeId: args.nodeId,
								type: "i",
								ioId,
							});
						}

					if (nodeConnections?.out)
						for (const ioId of Record.keys(nodeConnections.out ?? {})) {
							actions.disconnectIO(prev, {
								graphId: args.graph,
								nodeId: args.nodeId,
								type: "o",
								ioId,
							});
						}

					const nodeIndex = graph.nodes.findIndex(
						(node) => node.id === args.nodeId,
					);
					if (nodeIndex === -1) return;
					graph.nodes.splice(nodeIndex, 1);
				},
				setProject(data: ERequest.Request.Success<Request.GetProject>) {
					setState(
						reconcile({
							name: data.project.name,
							graphs: data.project.graphs.pipe(
								HashMap.entries,
								Iterable.reduce(
									{} as Record<Graph.Id, GraphState>,
									(acc, [id, graph]) => {
										acc[id] = {
											id,
											name: graph.name,
											comments: graph.comments,
											nodes: graph.nodes.pipe(
												HashMap.values,
												Iterable.map((node) => ({
													id: node.id,
													name: node.name,
													schema: node.schema,
													position: node.position,
													inputs: data.nodesIO.get(node.id)?.inputs ?? [],
													outputs: data.nodesIO.get(node.id)?.outputs ?? [],
													properties: node.properties?.pipe(
														HashMap.toEntries,
														Object.fromEntries,
													),
												})),
												(v) => Array.from(v),
											),
											connections: graph.connections.pipe(
												HashMap.entries,
												Iterable.reduce(
													{} as GraphTwoWayConnections,
													(acc, [nodeId, conns]) => {
														acc[nodeId] ??= {};
														acc[nodeId].out = conns as DeepMutable<
															typeof conns
														>;

														for (const outIo of Record.keys(conns)) {
															const outConns = conns[outIo];
															if (!outConns) continue;

															for (const [inNodeId, inIO] of outConns) {
																acc[inNodeId] ??= {};
																acc[inNodeId].in ??= {};

																(acc[inNodeId].in[inIO] ??= []).push([
																	nodeId,
																	outIo,
																]);
															}
														}

														return acc;
													},
												),
											),
										};
										return acc;
									},
								),
							),
							packages: data.packages.reduce(
								(acc, pkg) => {
									acc[pkg.id] = pkg;
									return acc;
								},
								{} as Record<Package.Id, Package.Package>,
							),
						}),
						// reconcile({
						// 	...data,
						// 	graphs: Object.entries(data.graphs).reduce(
						// 		(acc, [graphId, graph]) => {
						// 			const connections: GraphTwoWayConnections = {};
						// 			for (const [outNodeId, outNodeConnections] of Object.entries(
						// 				graph.connections,
						// 			)) {
						// 				for (const [outId, outConnections] of Object.entries(
						// 					outNodeConnections,
						// 				)) {
						// 					((connections[Node.Id.make(Number(outNodeId))] ??=
						// 						{}).out ??= {})[outId] = outConnections;
						// 					for (const [inNodeId, inId] of outConnections) {
						// 						(((connections[inNodeId] ??= {}).in ??= {})[inId] ??=
						// 							[]).push([Node.Id.make(Number(outNodeId)), outId]);
						// 					}
						// 				}
						// 			}
						// 			return Object.assign(acc, {
						// 				[graphId]: Object.assign(graph, { connections }),
						// 			});
						// 		},
						// 		{} as Record<string, GraphState>,
						// 	),
						// }),
					);
				},
			};

			return { state, setState, actions };
		}),
	},
) {}
