import { Effect, HashMap, Ref } from "effect";
import type { IO, Node, Project, Schema } from "@macrograph/project-domain";

import { NodeIOActions } from "./NodeIOActions.ts";
import { PackageActions } from "./PackageActions.ts";
import * as ProjectRuntime from "./ProjectRuntime.ts";

export class RuntimeActions extends Effect.Service<RuntimeActions>()(
	"RuntimeActions",
	{
		effect: Effect.gen(function* () {
			const packageActions = yield* PackageActions;
			const nodeIOActions = yield* NodeIOActions;

			return {
				loadProject: Effect.fn(function* (project: Project.Project) {
					const runtime = yield* ProjectRuntime.Current;

					yield* Ref.set(runtime.projectRef, project);

					const ios: Array<[Node.Id, ProjectRuntime.NodeIO]> = [];

					for (const graph of HashMap.values(project.graphs)) {
						for (const node of HashMap.values(graph.nodes)) {
							const schema = yield* packageActions.getSchema(node.schema);
							ios.push([node.id, yield* nodeIOActions.generateNodeIO(schema)]);
						}
					}

					yield* Ref.set(runtime.nodesIORef, HashMap.fromIterable(ios));
				}),
			};
		}),
		dependencies: [PackageActions.Default, NodeIOActions.Default],
	},
) {}
