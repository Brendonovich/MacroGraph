import { Effect, HashMap, Ref } from "effect";
import type { Project } from "@macrograph/project-domain";

// import { NodeIOActions } from "../NodeIOActions.ts";
// import { NodesIOStore } from "../NodesIOStore.ts";
// import { PackageActions } from "./PackageActions.ts";
// import * as ProjectRuntime from "./ProjectRuntime.ts";

export class RuntimeActions extends Effect.Service<RuntimeActions>()(
	"RuntimeActions",
	{
		effect: Effect.gen(function* () {
			// const packageActions = yield* PackageActions;
			// const nodeIOActions = yield* NodeIOActions;
			// const nodesIO = yield* NodesIOStore;

			return {
				loadProject: Effect.fn(function* (project: Project.Project) {
					// const runtime = yield* ProjectRuntime.Current;
					// yield* Ref.set(runtime.projectRef, project);
					// for (const graph of HashMap.values(project.graphs)) {
					// 	for (const node of HashMap.values(graph.nodes)) {
					// 		const schema = yield* packageActions.getSchema(node.schema);
					// 		yield* nodesIO.setForNode(
					// 			node.id,
					// 			yield* nodeIOActions.generateNodeIO(schema),
					// 		);
					// 	}
					// }
				}),
			};
		}),
		dependencies: [
			// PackageActions.Default,
			// NodeIOActions.Default,
			// NodesIOStore.Default,
		],
	},
) {}
