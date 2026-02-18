import {
	Context,
	Effect,
	HashMap,
	Layer,
	Match,
	Option,
	Record,
	Stream,
} from "effect";
import type { ProjectEvent } from "@macrograph/project-domain";
import { batch } from "solid-js";
import { produce } from "solid-js/store";

import { EditorState } from "./EditorState";

export class EditorEventStream extends Context.Tag("EditorEventStream")<
	EditorEventStream,
	Stream.Stream<ProjectEvent.EditorEvent>
>() {}

export class EditorEventHandler extends Effect.Service<EditorEventHandler>()(
	"EditorEventHandler",
	{
		effect: Effect.gen(function* () {
			const { setState, actions } = yield* EditorState;

			return Match.type<ProjectEvent.EditorEvent>().pipe(
				Match.tags({
					GraphItemsDeleted: (e) =>
						Effect.sync(() => {
							setState(
								produce((prev) => {
									for (const item of e.items) {
										if (item[0] === "Node") {
											actions.deleteNode(prev, {
												graph: e.graph,
												nodeId: item[1],
											});
										}
									}
								}),
							);
						}),
					NodePropertyUpdated: (e) => {
						return Effect.sync(() => {
							setState(
								"graphs",
								e.graph,
								"nodes",
								(n) => n.id === e.node,
								produce((node) => {
									node.properties ??= {};
									node.properties[e.property] = e.value;
								}),
							);
						});
					},
					ResourceConstantUpdated: (e) =>
						Effect.sync(() => {
							setState(
								"constants",
								e.id,
								produce((constant) => {
									if (e.value) constant.value = e.value;
									if (e.name) constant.name = e.name;
								}),
							);
						}),
					ResourceConstantCreated: (e) =>
						Effect.sync(() => {
							setState("constants", e.id, {
								type: "resource",
								name: e.name,
								pkg: e.pkg,
								resource: e.resource,
								value: Option.getOrUndefined(e.value),
							});
						}),
					ResourceConstantDeleted: (e) =>
						Effect.sync(() => {
							setState(
								produce((prev) => {
									delete prev.constants[e.id];
								}),
							);
						}),
					NodeIOUpdated: (e) =>
						Effect.sync(() => {
							batch(() => {
								if (e.outConnections) {
									const { outConnections } = e;
									setState(
										"graphs",
										e.graph,
										produce((graph) => {
											for (const [outIoId, outConns] of Record.toEntries(
												graph.connections[e.node]?.out ?? {},
											)) {
												for (const [inNodeId, inIoId] of outConns) {
													const inNodeConns = graph.connections[inNodeId];
													const inNodeIns = inNodeConns?.in;
													const inNodeIn = inNodeIns?.[inIoId];
													if (!inNodeIns || !inNodeIn) continue;
													inNodeIns[inIoId] = inNodeIn.filter(
														(in_) => !(in_[0] === e.node && in_[1] === outIoId),
													);
													if (inNodeIns[inIoId].length === 0)
														delete inNodeIns[inIoId];
													if (Record.size(inNodeIns) === 0)
														inNodeConns.in = undefined;
												}
											}

											const outNodeConns = (graph.connections[e.node] ??= {});
											const outNodeOuts = (outNodeConns.out = {} as NonNullable<
												typeof outNodeConns.out
											>);

											for (const [outIoId, outConns] of Record.toEntries(
												outConnections,
											)) {
												const outIoOuts = (outNodeOuts[outIoId] ??= []);

												for (const [inNodeId, inIoId] of outConns) {
													outIoOuts.push([inNodeId, inIoId]);

													const inNodeConns = graph.connections[inNodeId] ?? {};
													const inNodeIns = (inNodeConns.in ??= {});
													const inNodeIn = (inNodeIns[inIoId] ??= []);
													inNodeIn.push([e.node, outIoId]);
												}
											}
										}),
									);
								}

								if (e.io) {
									setState("graphs", e.graph, "nodes", (n) => n.id === e.node, {
										inputs: e.io.inputs,
										outputs: e.io.outputs,
									});
								}
							});
						}),
					GraphCreated: (e) =>
						Effect.sync(() => {
							setState("graphs", e.graph.id, {
								id: e.graph.id,
								name: e.graph.name,
								comments: [] as any,
								nodes: [],
								connections: [],
							});
						}),
					NodeCreated: (e) =>
						Effect.sync(() => {
							setState(
								produce((data) => {
									data.graphs[e.graph]?.nodes.push({
										id: e.node.id,
										name: e.node.name,
										schema: e.node.schema,
										position: e.node.position,
										inputs: e.io.inputs,
										outputs: e.io.outputs,
										properties:
											e.node.properties?.pipe(
												HashMap.toEntries,
												Record.fromEntries,
											) ?? {},
									});
								}),
							);
						}),
					GraphItemsMoved: (e) =>
						Effect.sync(() => {
							setState(
								produce((data) => {
									const _graph = data.graphs[e.graph];
									if (!_graph) return;
									for (const [[_, nodeId], position] of e.items) {
										const node = _graph.nodes.find((n) => n.id === nodeId);
										if (node) node.position = position;
									}
								}),
							);
						}),
				}),
				Match.orElse(() => Effect.void),
			);
		}),
		dependencies: [EditorState.Default],
	},
) {}

export const EditorEventStreamHandlerLive = Layer.scopedDiscard(
	Effect.gen(function* () {
		const stream = yield* EditorEventStream;
		yield* stream.pipe(
			Stream.runForEach(yield* EditorEventHandler),
			Effect.forkScoped,
		);
	}),
);
