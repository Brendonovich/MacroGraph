import { Effect, HashMap, pipe, Ref, RequestResolver } from "effect";
import {
	Graph,
	Node,
	Project,
	ProjectEvent,
	type Request,
} from "@macrograph/project-domain";

import * as ProjectRuntime from "./ProjectRuntime";
import { requestResolverServices } from "./Requests";

export class NodeRequests extends Effect.Service<NodeRequests>()(
	"NodeRequests",
	{
		effect: Effect.gen(function* () {
			const SetNodePropertyResolver = RequestResolver.fromEffect(
				(r: Request.SetNodeProperty) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;

						const project = yield* Ref.get(runtime.projectRef);
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const node = yield* HashMap.get(graph.nodes, r.node).pipe(
							Effect.catchAll(() => new Node.NotFound({ id: r.node })),
						);

						yield* pipe(
							new Graph.Graph({
								...graph,
								nodes: HashMap.set(graph.nodes, r.node, {
									...node,
									properties: HashMap.set(
										node.properties ?? HashMap.empty(),
										r.property,
										r.value,
									),
								}),
							}),
							(graph) => HashMap.set(project.graphs, r.graph, graph),
							(graphs) => new Project.Project({ ...project, graphs }),
							(p) => Ref.set(runtime.projectRef, p),
						);

						const e = new ProjectEvent.NodePropertyUpdated(r);

						yield* ProjectRuntime.publishEvent(e);

						return e;
					}),
			).pipe(requestResolverServices);

			return {
				setNodeProperty: Effect.request<
					Request.SetNodeProperty,
					typeof SetNodePropertyResolver
				>(SetNodePropertyResolver),
			};
		}),
	},
) {}
