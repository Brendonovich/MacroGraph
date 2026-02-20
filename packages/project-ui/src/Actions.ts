import { Effect, type Request as ERequest } from "effect";
import {
	type Graph,
	IO,
	type Node,
	type Package,
	type Position,
	ProjectEvent,
	Request,
	type Schema,
} from "@macrograph/project-domain";
import { createStore, produce } from "solid-js/store";

import { EditorEventHandler } from "./EditorEventHandler";
import { EditorState } from "./EditorState";
import { ProjectRequestHandler } from "./RequestHandler";

export class ProjectActions extends Effect.Service<ProjectActions>()(
	"ProjectActions",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { state } = yield* EditorState;
			const handleEvent = yield* EditorEventHandler;
			const reqHandler = yield* ProjectRequestHandler;

			type PendingRequest = Request.CreateNode | Request.ConnectIO;

			const [pending, setPending] = createStore<Array<PendingRequest>>([]);

			const withRequest =
				<R extends Request.Request>(config?: {
					pending?: R extends PendingRequest ? boolean : never;
				}) =>
				<A extends any[]>(
					cb: (
						_: (_: R) => Effect.Effect<ERequest.Request.Success<R>, any, never>,
						...__: A
					) => Effect.Effect<any, any>,
				) => {
					return (...args: A) => {
						let pendingReq: R | null = null;

						return cb(
							(v: R) => {
								if (config?.pending) {
									pendingReq = v;
									setPending(
										produce((draft) => {
											draft.push(v as any);
										}),
									);
								}

								return reqHandler[v._tag](v as any) as any;
							},
							...args,
						).pipe(
							Effect.ensuring(
								Effect.sync(() => {
									const index = pending.indexOf(pendingReq as any);
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
					) =>
						Effect.gen(function* () {
							yield* handleEvent(
								new ProjectEvent.GraphItemsMoved({ graph, items }),
							);

							yield* run(
								new Request.SetItemPositions({ graph, items, ephemeral }),
							);
						}),
				),
				CreateGraph: withRequest<Request.CreateGraph>()((run) =>
					run(new Request.CreateGraph({ name: "New Graph" })).pipe(
						Effect.andThen(handleEvent),
					),
				),
				CreateNode: withRequest<Request.CreateNode>({ pending: true })(
					(run, graph: Graph.Id, schema: Schema.Ref, position: Position) =>
						run(new Request.CreateNode({ schema, graph, position })).pipe(
							Effect.andThen(handleEvent),
						),
				),
				ConnectIO: withRequest<Request.ConnectIO>({ pending: true })(
					(run, graph: Graph.Id, _one: IO.RefString, _two: IO.RefString) =>
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
								Effect.andThen(handleEvent),
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

							let connections: Request.DisconnectIO["connections"];

							if (io.type === "i" && nodeConnections.in) {
								const conns = nodeConnections.in[io.id];
								if (!conns?.length) return;
								connections = conns.map(([outNodeId, outIoId]) => ({
									output: { node: outNodeId, io: outIoId },
									input: { node: io.nodeId, io: io.id },
								}));
							} else if (io.type === "o" && nodeConnections.out?.[io.id]) {
								const conns = nodeConnections.out[io.id];
								if (!conns?.length) return;
								connections = conns.map(([inNodeId, inIoId]) => ({
									output: { node: io.nodeId, io: io.id },
									input: { node: inNodeId, io: inIoId },
								}));
							} else return;

							const events = yield* run(
								new Request.DisconnectIO({ graph, connections }),
							);
							yield* Effect.forEach(events, handleEvent);
						}),
				),
				DeleteGraphItems: withRequest<Request.DeleteGraphItems>()(
					(run, graphId: Graph.Id, items: ReadonlyArray<Graph.ItemRef>) =>
						run(new Request.DeleteGraphItems({ graph: graphId, items })).pipe(
							Effect.andThen(handleEvent),
						),
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
						).pipe(Effect.andThen(handleEvent)),
				),
				SetInputDefault: withRequest<Request.SetInputDefault>()(
					(
						run,
						graphId: Graph.Id,
						nodeId: Node.Id,
						inputId: IO.Id,
						value: unknown,
					) =>
						run(
							new Request.SetInputDefault({
								graph: graphId,
								node: nodeId,
								input: inputId,
								value,
							}),
						).pipe(Effect.andThen(handleEvent)),
				),
				CreateResourceConstant: withRequest<Request.CreateResourceConstant>()(
					(run, pkg: Package.Id, resource: string) =>
						run(new Request.CreateResourceConstant({ pkg, resource })).pipe(
							Effect.andThen(handleEvent),
						),
				),
				UpdateResourceConstant: withRequest<Request.UpdateResourceConstant>()(
					(run, constantId: string, value?: string, name?: string) =>
						run(
							new Request.UpdateResourceConstant({
								id: constantId,
								value,
								name,
							}),
						).pipe(Effect.andThen(handleEvent)),
				),
				DeleteResourceConstant: withRequest<Request.DeleteResourceConstant>()(
					(run, constantId: string) =>
						run(new Request.DeleteResourceConstant({ id: constantId })).pipe(
							Effect.andThen(handleEvent),
						),
				),
				FetchSuggestions: withRequest<Request.FetchSuggestions>()(
					(run, graphId: Graph.Id, nodeId: Node.Id, inputId: IO.Id) =>
						run(
							new Request.FetchSuggestions({
								graph: graphId,
								node: nodeId,
								input: inputId,
							}),
						),
				),
			};
		}),
		dependencies: [EditorState.Default, EditorEventHandler.Default],
	},
) {}
