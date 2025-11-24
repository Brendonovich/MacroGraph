import { Option, pipe } from "effect";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as Ref from "effect/Ref";
import * as RequestResolver from "effect/RequestResolver";
import {
	Graph,
	Package,
	Project,
	ProjectEvent,
	Request,
} from "@macrograph/project-domain/updated";

import * as ProjectRuntime from "./ProjectRuntime";

export class ProjectRequests extends Effect.Service<ProjectRequests>()(
	"ProjectRequests",
	{
		effect: Effect.gen(function* () {
			const CreateGraphResolver = RequestResolver.fromEffect(
				(r: Request.CreateGraph) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;
						const project = yield* Ref.get(runtime.projectRef);

						const graphId = project.nextGraphId;

						const newGraph = new Graph.Graph({
							id: graphId,
							name: r.name,
							nodes: HashMap.empty(),
							comments: HashMap.empty(),
							connections: HashMap.empty(),
						});

						yield* Ref.set(
							runtime.projectRef,
							new Project.Project({
								...project,
								graphs: HashMap.set(project.graphs, newGraph.id, newGraph),
								nextGraphId: Graph.Id.make(graphId + 1),
							}),
						);

						const event = new ProjectEvent.GraphCreated({ graph: newGraph });

						yield* runtime.events.publish(event);

						return event;
					}),
			).pipe(RequestResolver.contextFromServices(ProjectRuntime.Current));

			const GetProjectResolver = RequestResolver.fromEffect(
				(_r: Request.GetProject) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;

						return {
							project: yield* Ref.get(runtime.projectRef),
							packages: pipe(
								runtime.packages.entries(),
								Iterable.map(([id, pkg]) => {
									const schemas = pipe(
										pkg.schemas.entries(),
										Iterable.map(
											([id, schema]) =>
												[
													id,
													{
														id,
														name: schema.name,
														type: schema.type,
													},
												] as const,
										),
										(v) => new Map(v),
									);

									return new Package.Package({
										id,
										name: pkg.name,
										schemas,
									});
								}),
								(v) => [...v],
							),
							nodesIO: yield* runtime.nodesIORef.pipe(
								Ref.get,
								Effect.map((v) => new Map(HashMap.entries(v))),
							),
						};
					}),
			).pipe(RequestResolver.contextFromServices(ProjectRuntime.Current));

			const GetPackageSettingsResolver = RequestResolver.fromEffect(
				(r: Request.GetPackageSettings) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;

						return yield* Option.fromNullable(
							runtime.packages.get(r.package),
						).pipe(
							Option.flatMap((p) => p.engine),
							Effect.flatMap((e) => e.state),
							Effect.catchTag(
								"NoSuchElementException",
								() => new Package.NotFound({ id: r.package }),
							),
						);
					}),
			).pipe(RequestResolver.contextFromServices(ProjectRuntime.Current));

			return {
				createGraph: Effect.request<
					Request.CreateGraph,
					typeof CreateGraphResolver
				>(CreateGraphResolver),

				getProject: Effect.request<
					Request.GetProject,
					typeof GetProjectResolver
				>(GetProjectResolver)(new Request.GetProject()),

				getPackageSettings: Effect.request<
					Request.GetPackageSettings,
					typeof GetPackageSettingsResolver
				>(GetPackageSettingsResolver),
			};
		}),
	},
) {}
