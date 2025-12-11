import { Effect, type Request as ERequest, Option } from "effect";
import {
	type Graph,
	IO,
	type Node,
	type Package,
	type Position,
	Request,
	type Schema,
} from "@macrograph/project-domain/updated";
import { createStore, produce } from "solid-js/store";

import { ProjectEventHandler } from "./ProjectEventHandler";
import { ProjectState } from "./State";

export class ProjectActions extends Effect.Service<ProjectActions>()(
	"ProjectActions",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { state, setState } = yield* ProjectState;
			const handleProjectEvent = yield* ProjectEventHandler;

			type PendingRequest = Request.CreateNode | Request.ConnectIO;

			const [pending, setPending] = createStore<Array<PendingRequest>>([]);

			const withRequest =
				<R extends ERequest.Request<any, any>>(config?: {
					pending?: R extends PendingRequest ? boolean : never;
				}) =>
				<
					F extends (
						_: (_: R) => Effect.Effect<ERequest.Request.Success<R>, any, never>,
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
				SetItemPositions: withRequest<Request.SetItemPositions>()(
					(
						run,
						graph: Graph.Id,
						items: ReadonlyArray<[Graph.ItemRef, Position]>,
						ephemeral = true,
					) => {
						setState(
							produce((data) => {
								const _graph = data.graphs[graph];
								if (!_graph) return;
								for (const [[_, nodeId], position] of items) {
									const node = _graph.nodes.find((n) => n.id === nodeId);
									if (node) node.position = position;
								}
							}),
						);
						return run(
							new Request.SetItemPositions({ graph, items, ephemeral }),
						);
					},
				),
				CreateGraph: withRequest<Request.CreateGraph>()((run) =>
					run(new Request.CreateGraph({ name: "New Graph" })).pipe(
						Effect.andThen(handleProjectEvent),
					),
				),
				CreateNode: withRequest<Request.CreateNode>({
					pending: true,
				})((run, graph: Graph.Id, schema: Schema.Ref, position: Position) =>
					run(new Request.CreateNode({ schema, graph, position })).pipe(
						Effect.andThen(handleProjectEvent),
					),
				),
				ConnectIO: withRequest<Request.ConnectIO>({
					pending: true,
				})((run, graph: Graph.Id, _one: IO.RefString, _two: IO.RefString) =>
					Effect.gen(function* () {
						const one = IO.parseRef(_one);
						const two = IO.parseRef(_two);

						let output: [Node.Id, IO.Id], input: [Node.Id, IO.Id];

						if (one.type === "o" && two.type === "i") {
							output = [one.nodeId, one.id] as const;
							input = [two.nodeId, two.id] as const;
						} else if (one.type === "i" && two.type === "o") {
							output = [two.nodeId, two.id] as const;
							input = [one.nodeId, one.id] as const;
						} else return;

						yield* run(new Request.ConnectIO({ graph, output, input })).pipe(
							Effect.andThen(handleProjectEvent),
						);
					}),
				),
				DisconnectIO: withRequest<Request.DisconnectIO>()(
					(run, graph: Graph.Id, _io: IO.RefString) =>
						Effect.gen(function* () {
							const io = IO.parseRef(_io);

							const nodeConnections =
								state.graphs[graph]?.connections[io.nodeId];

							if (!nodeConnections) return;

							let req;

							if (io.type === "i" && nodeConnections.in) {
								const conns = nodeConnections.in[io.id];
								if (conns?.[0]) {
									req = new Request.DisconnectIO({
										graph,
										output: {
											node: conns[0][0],
											io: conns[0][1],
										},
										input: {
											node: io.nodeId,
											io: io.id,
										},
									});
								} else return;
							} else if (io.type === "o" && nodeConnections.out?.[io.id]) {
								const conns = nodeConnections.out[io.id];
								if (conns?.[0]) {
									req = new Request.DisconnectIO({
										graph,
										output: {
											node: io.nodeId,
											io: io.id,
										},
										input: {
											node: conns[0][0],
											io: conns[0][1],
										},
									});
								} else return;
							} else return;

							const e = yield* run(req);
							if (e) yield* handleProjectEvent(e);
						}),
				),
				DeleteGraphItems: withRequest<Request.DeleteGraphItems>()(
					(run, graphId: Graph.Id, items: ReadonlyArray<Graph.ItemRef>) =>
						run(
							new Request.DeleteGraphItems({
								graph: graphId,
								items,
							}),
						).pipe(Effect.andThen(handleProjectEvent)),
				),
				SetNodeProperty: withRequest<Request.SetNodeProperty>()(
					(
						run,
						graphId: Graph.Id,
						nodeId: Node.Id,
						property: string,
						value: string,
					) =>
						run(
							new Request.SetNodeProperty({
								graph: graphId,
								node: nodeId,
								property,
								value,
							}),
						).pipe(Effect.andThen(handleProjectEvent)),
				),
				CreateResourceConstant: withRequest<Request.CreateResourceConstant>()(
					(run, pkg: Package.Id, resource: string) =>
						run(
							new Request.CreateResourceConstant({
								pkg,
								resource,
							}),
						).pipe(Effect.andThen(handleProjectEvent)),
				),
				UpdateResourceConstant: withRequest<Request.UpdateResourceConstant>()(
					(run, constantId: string, value: string) =>
						run(
							new Request.UpdateResourceConstant({
								id: constantId,
								value,
							}),
						).pipe(Effect.andThen(handleProjectEvent)),
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
		dependencies: [ProjectState.Default, ProjectEventHandler.Default],
	},
) {}
