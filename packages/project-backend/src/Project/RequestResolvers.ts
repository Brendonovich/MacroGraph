import {
	Graph,
	PackageMeta,
	Project,
	SchemaMeta,
	SchemaNotFound,
} from "@macrograph/project-domain";
import { Effect, Option, RequestResolver } from "effect";

import { ProjectPackages } from "./Packages";
import { project } from "./data";
import { ProjectActions } from "./Actions";

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
						io: { inputs: node.inputs, outputs: node.outputs },
					};
				}),
			);

			return { CreateNodeResolver };
		}),
	},
) {}
