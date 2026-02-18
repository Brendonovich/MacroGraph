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
} from "@macrograph/project-domain";
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

export type EditorPackageState = Omit<Package.Package, "resources"> & {
	resources: Record<string, { name: string }>;
};

export class EditorState extends Effect.Service<EditorState>()("EditorState", {
	scoped: Effect.gen(function* () {
		const [state, setState] = createStore<{
			name: string;
			graphs: Record<Graph.Id, GraphState>;
			packages: Record<Package.Id, EditorPackageState>;
			constants: Record<
				string,
				{ name: string } & {
					type: "resource";
					pkg: Package.Id;
					resource: string;
					value?: string;
				}
			>;
		}>({ name: "New Project", graphs: {}, packages: {}, constants: {} });

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
				args: { graph: Graph.Id; nodeId: Node.Id },
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
													acc[nodeId].out = conns as DeepMutable<typeof conns>;

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
								acc[pkg.id] = {
									...pkg,
									resources: Object.fromEntries(
										Object.entries(pkg.resources).map(([key, value]) => [
											key,
											{ name: value.name },
										]),
									),
								};
								return acc;
							},
							{} as Record<Package.Id, EditorPackageState>,
						),
						constants: data.project.constants.pipe(
							HashMap.toEntries,
							Record.fromEntries,
						),
					}),
				);
			},
		};

		return { state, setState, actions };
	}),
}) {}
