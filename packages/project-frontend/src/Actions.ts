import type { Rpc, RpcGroup } from "@effect/rpc";
import { Graph, Node, Position, SchemaRef } from "@macrograph/project-domain";
import { Effect, Request } from "effect";
import { createStore, produce } from "solid-js/store";

import { ProjectState } from "./State";

export class ProjectActions extends Effect.Service<ProjectActions>()(
	"ProjectActions",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { setState, actions } = yield* ProjectState;

			type PendingRequest = Graph.CreateNode | Graph.ConnectIO;

			const [pending, setPending] = createStore<Array<PendingRequest>>([]);

			const withRequest =
				<R extends Request.Request<any, any>>(config?: {
					pending?: R extends PendingRequest ? boolean : never;
				}) =>
				<
					F extends (
						_: (
							_: R,
						) => Effect.Effect<
							Request.Request.Success<R>,
							Request.Request.Error<R>,
							never
						>,
						...__: any[]
					) => Effect.Effect<void, unknown, never>,
				>(
					cb: F,
				) => {
					return (...[run, ...args]: Parameters<F>) => {
						let pendingReq: R | null = null;

						return cb(
							(v) => {
								if (config?.pending) {
									pendingReq = v;
									setPending(
										produce((draft) => {
											draft.push(v as any);
										}),
									);
								}

								return run(v);
							},
							...args,
						).pipe(
							Effect.ensuring(
								Effect.sync(() => {
									const index = pending.findIndex(
										(v) => v === (pendingReq as any),
									);
									setPending(
										produce((draft) => {
											if (index !== -1) draft.splice(index, 1);
										}),
									);
								}),
							),
							Effect.runPromise,
						);
					};
				};

			return {
				pending,
				SetNodePositions: withRequest<Node.SetNodePositions>()(
					(
						run,
						graphId: Graph.Id,
						positions: Array<[Node.Id, Position]>,
						ephemeral = true,
					) => {
						setState(
							produce((data) => {
								const graph = data.graphs[graphId];
								if (!graph) return;
								for (const [nodeId, position] of positions) {
									const node = graph.nodes.find((n) => n.id === nodeId);
									if (node) node.position = position;
								}
							}),
						);
						return run(new Node.SetNodePositions({ graphId, positions }));
					},
				),
				CreateNode: withRequest<Graph.CreateNode>({
					pending: true,
				})(
					(
						run,
						graphId: Graph.Id,
						schema: SchemaRef,
						position: [number, number],
					) =>
						Effect.gen(function* () {
							const resp = yield* run(
								new Graph.CreateNode({ schema, graphId, position }),
							);

							setState(
								produce((data) => {
									data.graphs[graphId]?.nodes.push({
										schema,
										id: resp.id,
										position: { x: position[0], y: position[1] },
										inputs: resp.io.inputs,
										outputs: resp.io.outputs,
									});
								}),
							);
						}),
				),
				ConnectIO: withRequest<Graph.ConnectIO>({
					pending: true,
				})(
					(
						run,
						graphId: Graph.Id,
						_one: Node.IORefString,
						_two: Node.IORefString,
					) =>
						Effect.gen(function* () {
							const one = Node.parseIORef(_one);
							const two = Node.parseIORef(_two);

							let output, input;

							if (one.type === "o" && two.type === "i") {
								output = { nodeId: one.nodeId, ioId: one.id };
								input = { nodeId: two.nodeId, ioId: two.id };
							} else if (one.type === "i" && two.type === "o") {
								output = { nodeId: two.nodeId, ioId: two.id };
								input = { nodeId: one.nodeId, ioId: one.id };
							} else return;

							yield* run(new Graph.ConnectIO({ graphId, output, input }));

							setState(
								produce((data) => {
									const connections = data.graphs[graphId]?.connections;
									if (!connections) return;

									const outNodeConnections = ((connections[output.nodeId] ??=
										{}).out ??= {});
									const outConnections = (outNodeConnections[output.ioId] ??=
										[]);
									outConnections.push([input.nodeId, input.ioId]);

									const inNodeConnections = ((connections[input.nodeId] ??=
										{}).in ??= {});
									const inConnections = (inNodeConnections[input.ioId] ??= []);
									inConnections.push([output.nodeId, output.ioId]);
								}),
							);
						}),
				),
				DisconnectIO: withRequest<Graph.DisconnectIO>()(
					(run, graphId: Graph.Id, _io: Node.IORefString) =>
						Effect.gen(function* () {
							const io = Node.parseIORef(_io);

							yield* run(
								new Graph.DisconnectIO({
									graphId,
									io: { nodeId: io.nodeId, ioId: io.id, type: io.type },
								}),
							);

							setState(
								produce((data) => {
									const connections = data.graphs[graphId]?.connections;
									if (!connections) return;

									const conns =
										io.type === "i"
											? connections[io.nodeId]?.in
											: connections[io.nodeId]?.out;

									if (!conns) return;

									const ioConnections = conns[io.id];
									delete conns[io.id];
									if (!ioConnections) return;

									for (const ioConnection of ioConnections) {
										const [nodeId, ioId] = ioConnection;

										const oppNodeConnections =
											io.type === "i"
												? connections[nodeId]?.out
												: connections[nodeId]?.in;
										if (!oppNodeConnections) continue;

										const oppConnections = oppNodeConnections[ioId];
										if (!oppConnections) continue;

										const index = oppConnections.findIndex(
											([nodeId, inId]) =>
												nodeId === io.nodeId && inId === io.id,
										);
										if (index !== -1) oppConnections.splice(index, 1);
										if (oppConnections.length < 1)
											delete oppNodeConnections[ioId];
									}
								}),
							);
						}),
				),
				DeleteSelection: withRequest<Graph.DeleteSelection>()(
					(run, graphId: Graph.Id, selection: Array<Node.Id>) =>
						Effect.gen(function* () {
							yield* run(
								new Graph.DeleteSelection({ graph: graphId, selection }),
							);

							setState(
								produce((prev) => {
									for (const nodeId of selection) {
										actions.deleteNode(prev, { graphId, nodeId });
									}
								}),
							);
						}),
				),
				// StartServerRegistration: Effect.gen(function* () {
				// 	const getFlowStatus = yield* rpc
				// 		.StartServerRegistration()
				// 		.pipe(Stream.toPull);

				// 	const status = yield* getFlowStatus.pipe(
				// 		Effect.map(Chunk.get(0)),
				// 		Effect.map(Option.getOrThrow),
				// 	);
				// 	if (status.type !== "started")
				// 		throw new Error("Flow status is not started");

				// 	window.open(status.verificationUrlComplete);

				// 	yield* getFlowStatus.pipe(
				// 		Effect.map(Chunk.get(0)),
				// 		Effect.map(Option.getOrThrow),
				// 	);
				// }).pipe(Effect.scoped),
			};
		}),
		dependencies: [ProjectState.Default],
	},
) {}
