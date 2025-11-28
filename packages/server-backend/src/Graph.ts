import { SchemaNotFound } from "@macrograph/project-domain";
import { Graph, Policy } from "@macrograph/server-domain";
import { Effect, Option } from "effect";
import { ProjectRuntime } from "@macrograph/project-backend";

import { RealtimePubSub } from "./Realtime";

import { project } from "./project-data";
import { ServerPolicy } from "./ServerPolicy";

export class Graphs extends Effect.Service<Graphs>()("Graphs", {
	sync: () => {
		return {
			get: (id: Graph.Id) =>
				Effect.succeed(Option.fromNullable(project.graphs.get(id))),
		};
	},
}) {}

export const GraphRpcsLive = Graph.Rpcs.toLayer(
	Effect.gen(function* () {
		const projectActions = yield* ProjectRuntime;
		const realtime = yield* RealtimePubSub;
		const serverPolicy = yield* ServerPolicy;

		return {
			CreateNode: Effect.fn(
				function* (payload) {
					const node = yield* projectActions
						.createNode(payload.graphId, payload.schema, [...payload.position])
						.pipe(Effect.mapError(() => new SchemaNotFound(payload.schema)));

					yield* realtime.publish({
						type: "NodeCreated",
						graphId: payload.graphId,
						nodeId: node.id,
						position: node.position,
						schema: payload.schema,
						inputs: node.inputs,
						outputs: node.outputs,
					});

					return {
						id: node.id,
						io: { inputs: node.inputs, outputs: node.outputs },
					};
				},
				(e) => e.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			),
			ConnectIO: Effect.fn(
				function* (payload) {
					yield* projectActions.addConnection(
						payload.graphId,
						payload.output,
						payload.input,
					);

					yield* realtime.publish({
						type: "IOConnected",
						graphId: payload.graphId,
						output: payload.output,
						input: payload.input,
					});
				},
				(e) => e.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			),
			DisconnectIO: Effect.fn(
				function* (payload) {
					yield* projectActions.disconnectIO(payload.graphId, payload.io);

					yield* realtime.publish({
						type: "IODisconnected",
						graphId: payload.graphId,
						io: payload.io,
					});
				},
				(e) => e.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			),
			DeleteSelection: Effect.fn(
				function* (payload) {
					yield* projectActions.deleteSelection(
						payload.graph,
						payload.selection as DeepWriteable<typeof payload.selection>,
					);

					yield* realtime.publish({
						type: "SelectionDeleted",
						graphId: payload.graph,
						selection: payload.selection,
					});
				},
				(e) => e.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			),
		};
	}),
);
