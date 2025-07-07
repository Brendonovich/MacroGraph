import { Effect, Option } from "effect";
import {
	PackageMeta,
	Project,
	SchemaMeta,
	Graph,
} from "@macrograph/server-domain";

import { ProjectPackages } from "./Packages";
import { project } from "../project-data";

export const ProjectRpcsLive = Project.Rpcs.toLayer(
	Effect.gen(function* () {
		const packages = yield* ProjectPackages;

		return {
			GetProject: Effect.fn(function* () {
				return {
					name: project.name,
					graphs: (() => {
						const ret: Record<string, DeepWriteable<Graph.Shape>> = {};

						for (const [key, value] of project.graphs.entries()) {
							ret[key] = {
								...value,
								connections: (() => {
									const ret: DeepWriteable<Graph.Shape["connections"]> = {};
									if (!value.connections) return ret;

									for (const [
										key,
										nodeConnections,
									] of value.connections.entries()) {
										if (!nodeConnections.out) continue;
										const outputConns = (ret[key] = {} as (typeof ret)[string]);
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
			GetPackageSettings: Effect.fn(function* (payload) {
				const pkg = packages.get(payload.package)!;
				return yield* Option.getOrNull(pkg.state)!.get;
			}),
		};
	}),
);
