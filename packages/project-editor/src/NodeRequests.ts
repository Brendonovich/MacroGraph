import { Effect, HashMap, pipe, Ref, RequestResolver } from "effect";
import {
	Graph,
	Node,
	Project,
	ProjectEvent,
	type Request,
} from "@macrograph/project-domain";

import * as ProjectEditor from "./ProjectEditor";
import { requestResolverServices } from "./Requests";

export class NodeRequests extends Effect.Service<NodeRequests>()(
	"NodeRequests",
	{
		effect: Effect.gen(function* () {
			const SetNodePropertyResolver = RequestResolver.fromEffect(
				(r: Request.SetNodeProperty) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor.ProjectEditor;

						const project = yield* editor.project;
						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchAll(() => new Graph.NotFound({ id: r.graph })),
						);

						const node = yield* HashMap.get(graph.nodes, r.node).pipe(
							Effect.catchAll(() => new Node.NotFound({ id: r.node })),
						);

						const newNode = (node.properties ?? HashMap.empty()).pipe(
							HashMap.set(r.property, r.value),
							(properties) => Node.Node.make({ ...node, properties }),
						);

						yield* pipe(
							HashMap.set(graph.nodes, r.node, newNode),
							(nodes) => new Graph.Graph({ ...graph, nodes }),
							(graph) => HashMap.set(project.graphs, r.graph, graph),
							(graphs) => new Project.Project({ ...project, graphs }),
							(p) => editor.modifyProject(() => p),
						);

						yield* editor.generateNodeIO(graph.id, newNode);

						return yield* editor.publishEvent(
							new ProjectEvent.NodePropertyUpdated(r),
						);
					}),
			).pipe(requestResolverServices);

			return { SetNodePropertyResolver };
		}),
	},
) {}
