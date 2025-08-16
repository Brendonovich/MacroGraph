import { SchemaNotFound } from "@macrograph/domain";
import { CurrentUser, Graph } from "@macrograph/server-domain";
import { Effect, Fiber, Option } from "effect";

import { ProjectActions } from "./Project/Actions";
import { RealtimeConnection, RealtimePubSub } from "./Realtime";

import { project } from "./project-data";

export class Graphs extends Effect.Service<Graphs>()("Graphs", {
	sync: () => {
		return {
			get: Effect.fn(function* (id: Graph.Id) {
				return Option.fromNullable(project.graphs.get(id));
			}),
		};
	},
}) {}

export const GraphRpcsLive = Graph.Rpcs.toLayer(
	Effect.gen(function* () {
		const projectActions = yield* ProjectActions;
		const realtime = yield* RealtimePubSub;

		return {
			CreateNode: (payload) =>
				Effect.gen(function* () {
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
				}),
			ConnectIO: Effect.fn(function* (payload) {
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
			}),
			DisconnectIO: Effect.fn(function* (payload) {
				yield* projectActions.disconnectIO(payload.graphId, payload.io);

				yield* realtime.publish({
					type: "IODisconnected",
					graphId: payload.graphId,
					io: payload.io,
				});
			}),
			DeleteSelection: Effect.fn(function* (payload) {
				yield* projectActions.deleteSelection(
					payload.graph,
					payload.selection as DeepWriteable<typeof payload.selection>,
				);

				yield* realtime.publish({
					type: "SelectionDeleted",
					graphId: payload.graph,
					selection: payload.selection,
				});
			}),
		};
	}),
);
