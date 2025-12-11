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
import type { ProjectEvent } from "@macrograph/project-domain/updated";
import { batch, createEffect, createRoot, onCleanup } from "solid-js";
import { produce } from "solid-js/store";

import { PackageClients } from "./Packages/Clients";
import { ProjectState } from "./State";

export class ProjectEventStream extends Context.Tag("ProjectEventStream")<
	ProjectEventStream,
	Stream.Stream<ProjectEvent.ProjectEvent>
>() {}

export class ProjectEventHandler extends Effect.Service<ProjectEventHandler>()(
	"ProjectEventHandler",
	{
		effect: Effect.gen(function* () {
			const { state, setState, actions } = yield* ProjectState;
			const pkgClients = yield* PackageClients;

			return Match.type<ProjectEvent.ProjectEvent>().pipe(
				Match.tags({
					PackageStateChanged: (e) =>
						Effect.gen(function* () {
							yield* pkgClients.getPackage(e.pkg).pipe(
								Effect.flatMap((p) => p.notifySettingsChange),
								Effect.catchAll(() => Effect.void),
							);
						}),
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
					NodePropertyUpdated: (e) =>
						Effect.sync(() => {
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
						}),
					PackageResourcesUpdated: (e) =>
						Effect.sync(() => {
							setState(
								"packages",
								e.package,
								"resources",
								produce((resources) => {
									for (const [resource, values] of Object.entries(
										e.resources,
									)) {
										const resourceState = resources[resource];
										if (!resourceState) continue;
										resources[resource] = {
											...resourceState,
											values: [...values],
										};
									}
								}),
							);
						}),
					ResourceConstantUpdated: (e) =>
						Effect.sync(() => {
							setState(
								"constants",
								e.id,
								produce((constant) => {
									constant.value = e.value;
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
													console.log(inNodeIn);
												}

												// console.log(outIoOuts);
											}
										}),
									);
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
				}),
				Match.orElse(() => Effect.void),
			);
		}),
		dependencies: [ProjectState.Default, PackageClients.Default],
	},
) {}

export const ProjectEventStreamHandlerLive = Layer.scopedDiscard(
	Effect.gen(function* () {
		const stream = yield* ProjectEventStream;
		yield* stream.pipe(
			Stream.runForEach(yield* ProjectEventHandler),
			Effect.forkScoped,
		);
	}),
);
