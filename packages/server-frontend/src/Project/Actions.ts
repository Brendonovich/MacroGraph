import { Chunk, Effect, Option, Stream } from "effect";
import { createStore, produce } from "solid-js/store";
import {
	SchemaRef,
	Graph,
	Node,
	Position,
	Rpcs,
} from "@macrograph/server-domain";
import { Rpc, RpcGroup } from "@effect/rpc";

import { ProjectRpc } from "./Rpc";
import { ProjectState } from "./State";
import { IORef, parseIORef } from "../utils";

export class ProjectActions extends Effect.Service<ProjectActions>()(
	"ProjectActions",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const rpc = yield* ProjectRpc.client;
			const { setState, actions } = yield* ProjectState;

			type RpcToObject<T> = T extends Rpc.Rpc<
				infer Name,
				infer Payload,
				any,
				any,
				any
			>
				? { name: Name; payload: Payload["Type"] }
				: never;
			type RpcsAsObject = RpcToObject<RpcGroup.Rpcs<typeof Rpcs>>;

			const [pending, setPending] = createStore<Array<RpcsAsObject>>([]);

			const withPending = <T extends RpcsAsObject>(
				name: T["name"],
				payload: T["payload"],
			) => {
				setPending(
					produce((draft) => {
						draft.push({ name, payload } as any);
					}),
				);

				const pendingEntry = pending[pending.length - 1];

				return <A, E, R>(effect: Effect.Effect<A, E, R>) =>
					Effect.ensuring(
						effect,
						Effect.sync(() => {
							const index = pending.findIndex((e) => e === pendingEntry);
							setPending(
								produce((draft) => {
									if (index !== -1) draft.splice(index, 1);
								}),
							);
						}),
					);
			};

			return {
				pending,
				SetNodePositions: (
					graphId: Graph.Id,
					positions: Array<[Node.Id, Position]>,
					ephemeral = true,
				) => {
					rpc.SetNodePositions({ graphId, positions }).pipe(Effect.runPromise);
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
				},
				CreateNode: (
					graphId: Graph.Id,
					schema: SchemaRef,
					position: [number, number],
				) =>
					Effect.gen(function* () {
						const resp = yield* rpc.CreateNode({ schema, graphId, position });

						setState(
							produce((data) => {
								data.graphs[graphId]?.nodes.push({
									schema,
									id: resp.id,
									position: { x: position[0], y: position[1] },
									inputs: resp.io.inputs as DeepWriteable<
										typeof resp.io.inputs
									>,
									outputs: resp.io.outputs as DeepWriteable<
										typeof resp.io.outputs
									>,
								});
							}),
						);
					}).pipe(
						withPending("CreateNode", { graphId, schema, position }),
						Effect.runPromise,
					),
				ConnectIO: (graphId: Graph.Id, _one: IORef, _two: IORef) => {
					const one = parseIORef(_one);
					const two = parseIORef(_two);

					let output, input;

					if (one.type === "o" && two.type === "i") {
						output = { nodeId: one.nodeId, ioId: one.id };
						input = { nodeId: two.nodeId, ioId: two.id };
					} else if (one.type === "i" && two.type === "o") {
						output = { nodeId: two.nodeId, ioId: two.id };
						input = { nodeId: one.nodeId, ioId: one.id };
					} else return;

					return Effect.gen(function* () {
						yield* rpc.ConnectIO({ graphId, output, input });

						setState(
							produce((data) => {
								const connections = data.graphs[graphId]?.connections;
								if (!connections) return;

								const outNodeConnections = ((connections[output.nodeId] ??=
									{}).out ??= {});
								const outConnections = (outNodeConnections[output.ioId] ??= []);
								outConnections.push([input.nodeId, input.ioId]);

								const inNodeConnections = ((connections[input.nodeId] ??=
									{}).in ??= {});
								const inConnections = (inNodeConnections[input.ioId] ??= []);
								inConnections.push([output.nodeId, output.ioId]);
							}),
						);
					}).pipe(
						withPending("ConnectIO", { graphId, output, input }),
						Effect.runPromise,
					);
				},
				DisconnectIO: (graphId: Graph.Id, _io: IORef) =>
					Effect.gen(function* () {
						const io = parseIORef(_io);

						yield* rpc.DisconnectIO({
							graphId,
							io: { nodeId: io.nodeId, ioId: io.id, type: io.type },
						});

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
										([nodeId, inId]) => nodeId === io.nodeId && inId === io.id,
									);
									if (index !== -1) oppConnections.splice(index, 1);
									if (oppConnections.length < 1)
										delete oppNodeConnections[ioId];
								}
							}),
						);
					}).pipe(Effect.runPromise),
				DeleteSelection: (graphId: Graph.Id, selection: Array<Node.Id>) =>
					Effect.gen(function* () {
						yield* rpc.DeleteSelection({ graph: graphId, selection });

						setState(
							produce((prev) => {
								for (const nodeId of selection) {
									actions.deleteNode(prev, { graphId, nodeId });
								}
							}),
						);
					}).pipe(Effect.runPromise),
				CloudLogin: Effect.gen(function* () {
					const getFlowStatus = yield* rpc.CloudLogin().pipe(Stream.toPull);

					const status = yield* getFlowStatus.pipe(
						Effect.map(Chunk.get(0)),
						Effect.map(Option.getOrThrow),
					);
					if (status.type !== "started")
						throw new Error("Flow status is not started");

					window.open(status.verificationUrlComplete);

					const complete = yield* getFlowStatus.pipe(
						Effect.map(Chunk.get(0)),
						Effect.map(Option.getOrThrow),
					);
				}).pipe(Effect.scoped),
			};
		}),
		dependencies: [ProjectRpc.Default, ProjectState.Default],
	},
) {}
