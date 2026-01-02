import { identity, Option, pipe, Record } from "effect";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as Ref from "effect/Ref";
import * as RequestResolver from "effect/RequestResolver";
import {
	Credential,
	Graph,
	IO,
	Package,
	Project,
	ProjectEvent,
	Request,
} from "@macrograph/project-domain";

import * as ProjectRuntime from "./ProjectRuntime";
import { requestResolverServices } from "./Requests";

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

						yield* ProjectRuntime.publishEvent(event);

						return event;
					}),
			).pipe(requestResolverServices);

			const GetProjectResolver = RequestResolver.fromEffect(
				(_r: Request.GetProject) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;

						return {
							project: yield* Ref.get(runtime.projectRef),
							packages: yield* pipe(
								runtime.packages.entries(),
								Iterable.map(([id, pkg]) =>
									Effect.gen(function* () {
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
															properties: Object.entries(
																schema.properties ?? {},
															).map(([id, property]) => ({
																id,
																name: property.name,
																resource: property.resource.id,
															})),
														},
													] as const,
											),
											(v) => new Map(v),
										);

										return new Package.Package({
											id,
											name: pkg.name,
											schemas,
											resources: yield* pkg.engine.pipe(
												Option.map((e) =>
													pipe(
														e.def.resources ?? [],
														Iterable.map((r) =>
															e.getResourceValues(r.id).pipe(
																Effect.option,
																Effect.flatMap(
																	Effect.fn(function* (v) {
																		return [
																			r.id,
																			{
																				name: r.name,
																				values: v.pipe(
																					Option.flatten,
																					Option.getOrElse(() => []),
																				),
																			},
																		] as const;
																	}),
																),
															),
														),
														Effect.all,
														Effect.map(Record.fromEntries),
													),
												),
												Effect.transposeOption,
												Effect.map(Option.getOrElse(Record.empty)),
											),
										});
									}),
								),
								Effect.all,
							),
							nodesIO: yield* runtime.nodesIORef.pipe(
								Ref.get,
								Effect.map((v) => new Map(HashMap.entries(v))),
							),
						};
					}),
			).pipe(requestResolverServices);

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
			).pipe(requestResolverServices);

			const CreateResourceConstantResolver = RequestResolver.fromEffect(
				(r: Request.CreateResourceConstant) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;
						const project = yield* runtime.projectRef;

						const pkg = runtime.packages.get(r.pkg);
						if (!pkg) return yield* new Package.NotFound({ id: r.pkg });

						const name = "New Constant";
						const id = Math.random().toString();

						yield* Ref.set(
							runtime.projectRef,
							new Project.Project({
								...project,
								constants: HashMap.set(project.constants, id, {
									name,
									type: "resource",
									pkg: pkg.id,
									resource: r.resource,
								}),
							}),
						);

						const event = new ProjectEvent.ResourceConstantCreated({
							pkg: pkg.id,
							resource: r.resource,
							name,
							id,
							value: Option.none(),
						});
						yield* ProjectRuntime.publishEvent(event);
						return event;
					}),
			).pipe(requestResolverServices);

			const UpdateResourceConstant = RequestResolver.fromEffect(
				(r: Request.UpdateResourceConstant) =>
					Effect.gen(function* () {
						const runtime = yield* ProjectRuntime.Current;
						const project = yield* runtime.projectRef;

						// TODO: Validate resource value

						yield* Ref.update(
							runtime.projectRef,
							(p) =>
								new Project.Project({
									...p,
									constants: HashMap.modify(
										project.constants,
										r.id,
										(constant) => ({
											...constant,
											value: r.value ?? constant.value,
											name: r.name ?? constant.name,
										}),
									),
								}),
						);

						const event = new ProjectEvent.ResourceConstantUpdated({
							id: r.id,
							value: r.value,
							name: r.name,
						});
						yield* ProjectRuntime.publishEvent(event);
						return event;
					}),
			).pipe(requestResolverServices);

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

				createResourceConstant: Effect.request<
					Request.CreateResourceConstant,
					typeof CreateResourceConstantResolver
				>(CreateResourceConstantResolver),

				updateResourceConstant: Effect.request<
					Request.UpdateResourceConstant,
					typeof UpdateResourceConstant
				>(UpdateResourceConstant),
			};
		}),
	},
) {}
