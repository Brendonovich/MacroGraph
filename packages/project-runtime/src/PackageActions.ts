import { Effect, HashMap, RequestResolver } from "effect";
import { DataInput } from "@macrograph/package-sdk";
import {
	Graph,
	IO,
	Node,
	Package,
	type Request,
} from "@macrograph/project-domain";

import { EngineRegistry } from "./EngineRegistry.ts";
import { collectNodeProperties, NodeExecution } from "./NodeExecution.ts";
import { ProjectRuntime } from "./ProjectRuntime.ts";

export class PackageActions extends Effect.Service<PackageActions>()(
	"PackageActions",
	{
		effect: Effect.gen(function* () {
			const GetPackageEngineStateResolver = RequestResolver.fromEffect(
				(r: Request.GetPackageEngineState) =>
					Effect.gen(function* () {
						const { engines } = yield* EngineRegistry.EngineRegistry;

						const getState = engines.get(r.package)?.state;
						if (!getState)
							return yield* new Package.NotFound({ id: r.package });

						return yield* getState.get;
					}),
			).pipe(
				RequestResolver.contextFromServices(EngineRegistry.EngineRegistry),
			);

			const FetchSuggestionsResolver = RequestResolver.fromEffect(
				(r: Request.FetchSuggestions) =>
					Effect.gen(function* () {
						const project = yield* ProjectRuntime.CurrentProject;
						const runtime = yield* ProjectRuntime.ProjectRuntime;

						const graph = yield* HashMap.get(project.graphs, r.graph).pipe(
							Effect.catchTag(
								"NoSuchElementException",
								() => new Graph.NotFound({ id: r.graph }),
							),
						);

						const node = yield* HashMap.get(graph.nodes, r.node).pipe(
							Effect.catchTag(
								"NoSuchElementException",
								() => new Node.NotFound({ id: r.node }),
							),
						);

						const schema = yield* runtime.schema(node.schema);

						const { inputs } = yield* IO.generateNodeIO(schema, node);

						const entry = inputs.find(([port]) => port.id === r.input);

						if (!entry) return yield* new IO.NotFound({ id: r.input });

						const [, sdkInput] = entry;

						if (!(sdkInput instanceof DataInput) || !sdkInput.suggestions)
							return yield* new IO.NotFound({ id: r.input });

						const suggestions = sdkInput.suggestions;

						return yield* collectNodeProperties(node, schema).pipe(
							Effect.flatMap((p) => suggestions({ properties: p })),
							Effect.catchAll(() => Effect.succeed([])),
						);
					}),
			).pipe(
				RequestResolver.contextFromServices(
					ProjectRuntime.ProjectRuntime,
					ProjectRuntime.CurrentProject,
					EngineRegistry.EngineRegistry,
				),
			);

			return { GetPackageEngineStateResolver, FetchSuggestionsResolver };
		}),
		dependencies: [NodeExecution.Default],
	},
) {}
