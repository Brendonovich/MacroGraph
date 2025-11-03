import {
	Graph,
	type Node,
	type PackageMeta,
	type Project,
	type SchemaMeta,
	SchemaNotFound,
} from "@macrograph/project-domain";
import { Effect, Option, RequestResolver } from "effect";

import { ProjectPackages } from "./Packages";
import { project } from "./data";
import { ProjectActions } from "./Actions";
import { Graphs } from "../Graph";

export class ProjectRequests extends Effect.Service<ProjectRequests>()(
	"ProjectRequests",
	{
		effect: Effect.gen(function* () {
			const packages = yield* ProjectPackages;

			const GetProjectResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (_: Project.GetProject) {
					return {
						name: project.name,
						graphs: (() => {
							const ret: Record<string, Graph.Shape> = {};

							for (const [key, value] of project.graphs.entries()) {
								ret[key] = {
									...value,
									connections: (() => {
										const ret: Graph.Shape["connections"] = {};
										if (!value.connections) return ret;

										for (const [
											key,
											nodeConnections,
										] of value.connections.entries()) {
											if (!nodeConnections.out) continue;
											const outputConns = (ret[key] =
												{} as (typeof ret)[string]);
											for (const [
												key,
												outputConnections,
											] of nodeConnections.out.entries()) {
												outputConns[key] = outputConnections;
											}
										}

										return ret;
									})(),
								};
							}

							return ret;
						})(),
						packages: [...packages.entries()].reduce(
							(acc, [id, { pkg }]) => {
								acc[id] = {
									name: pkg.name,
									schemas: [...pkg.schemas.entries()].reduce(
										(acc, [id, schema]) => {
											acc[id] = { id, name: schema.name, type: schema.type };
											return acc;
										},
										{} as Record<string, SchemaMeta>,
									),
								};
								return acc;
							},
							{} as Record<string, PackageMeta>,
						),
					};
				}),
			);

			const GetPackageSettingsResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (req: Project.GetPackageSettings) {
					const pkg = packages.get(req.package)!;
					return yield* Option.getOrNull(pkg.state)!.get;
				}),
			);

			return { GetProjectResolver, GetPackageSettingsResolver };
		}),
		dependencies: [ProjectPackages.Default],
	},
) {}

export class GraphRequests extends Effect.Service<GraphRequests>()(
	"GraphRequests",
	{
		effect: Effect.gen(function* () {
			const projectActions = yield* ProjectActions;

			const CreateNodeResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (payload: Graph.CreateNode) {
					const node = yield* projectActions
						.createNode(payload.graphId, payload.schema, [...payload.position])
						.pipe(Effect.mapError(() => new SchemaNotFound(payload.schema)));

					return {
						id: node.id,
						name: node.name,
						io: { inputs: node.inputs, outputs: node.outputs },
					};
				}),
			);

			const ConnectIOResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (payload: Graph.ConnectIO) {
					yield* projectActions.addConnection(
						payload.graphId,
						payload.output,
						payload.input,
					);
				}),
			);

			const DisconnectIOResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (payload: Graph.DisconnectIO) {
					yield* projectActions.disconnectIO(payload.graphId, payload.io);
				}),
			);

			const DeleteSelectionResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (payload: Graph.DeleteSelection) {
					yield* projectActions.deleteSelection(
						payload.graph,
						payload.selection,
					);
				}),
			);

			return {
				CreateNodeResolver,
				ConnectIOResolver,
				DisconnectIOResolver,
				DeleteSelectionResolver,
			};
		}),
	},
) {}

export class NodeRequests extends Effect.Service<NodeRequests>()(
	"NodeRequests",
	{
		effect: Effect.gen(function* () {
			const graphs = yield* Graphs;
			// const realtime = yield* RealtimePubSub;
			// const serverPolicy = yield* ServerPolicy;

			const SetNodePositionsResolver = RequestResolver.fromEffect(
				Effect.fnUntraced(function* (payload: Node.SetNodePositions) {
					const graph = yield* graphs
						.get(payload.graphId)
						.pipe(
							Effect.andThen(
								Effect.catchTag(
									"NoSuchElementException",
									() => new Graph.NotFound({ graphId: payload.graphId }),
								),
							),
						);

					const positions: Array<{
						node: Node.Id;
						position: { x: number; y: number };
					}> = [];

					for (const [nodeId, position] of payload.positions) {
						const node = graph.nodes.find((node) => node.id === nodeId);
						if (!node) continue;
						node.position = position;
						positions.push({ node: nodeId, position });
					}

					// yield* realtime.publish({
					// 	type: "NodesMoved",
					// 	graphId: graph.id,
					// 	positions: payload.positions,
					// });
				}),
			);

			return { SetNodePositionsResolver };
		}),
		dependencies: [Graphs.Default],
	},
) {}
