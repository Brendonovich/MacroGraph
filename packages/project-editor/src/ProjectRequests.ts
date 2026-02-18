import { Option, pipe, Record } from "effect";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as RequestResolver from "effect/RequestResolver";
import {
	Graph,
	NodesIOStore,
	Package,
	Project,
	ProjectEvent,
	type Request,
	Schema,
} from "@macrograph/project-domain";
import * as T from "@macrograph/typesystem";
import "@total-typescript/ts-reset/filter-boolean";

import { ProjectEditor } from "./ProjectEditor";
import { requestResolverServices } from "./Requests";

export class ProjectRequests extends Effect.Service<ProjectRequests>()(
	"ProjectRequests",
	{
		effect: Effect.gen(function* () {
			const CreateGraphResolver = RequestResolver.fromEffect(
				(r: Request.CreateGraph) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;
						const project = yield* editor.project;

						const graphId = project.nextGraphId;

						const newGraph = new Graph.Graph({
							id: graphId,
							name: r.name,
							nodes: HashMap.empty(),
							comments: HashMap.empty(),
							connections: HashMap.empty(),
						});

						yield* editor.modifyProject(
							() =>
								new Project.Project({
									...project,
									graphs: HashMap.set(project.graphs, newGraph.id, newGraph),
									nextGraphId: Graph.Id.make(graphId + 1),
								}),
						);

						return yield* editor.publishEvent(
							new ProjectEvent.GraphCreated({ graph: newGraph }),
						);
					}),
			).pipe(requestResolverServices);

			const GetProjectResolver = RequestResolver.fromEffect(
				(_r: Request.GetProject) =>
					Effect.gen(function* () {
						const nodesIO = yield* NodesIOStore;
						const editor = yield* ProjectEditor;

						return {
							project: yield* editor.project,
							packages: yield* pipe(
								yield* editor.packages,
								Iterable.map(([id, pkg]) =>
									Effect.gen(function* () {
										const schemas = pipe(
											pkg.schemas.entries(),
											Iterable.map(
												([id, schema]) =>
													[
														Schema.Id.make(id),
														{
															id: Schema.Id.make(id),
															name: schema.name,
															type: schema.type,
															properties: Object.entries(
																schema.properties ?? {},
															)
																.map(([id, property]) => ({
																	id,
																	name: property.name,
																	...("resource" in property
																		? { resource: property.resource.id }
																		: { type: T.serialize(property.type) }),
																}))
																.filter(Boolean),
														},
													] as const,
											),
											(v) => new Map(v),
										);

										return new Package.Package({
											id,
											name: pkg.name,
											schemas,
											resources: Option.fromNullable(
												pkg.engine?.resources,
											).pipe(
												Option.map((resources) =>
													Record.fromEntries(
														resources.map((r) => [r.id, { name: r.name_ }]),
													),
												),
												Option.getOrElse(() => ({})),
											),
										});
									}),
								),
								Effect.all,
							),
							nodesIO: yield* nodesIO.getAll.pipe(
								Effect.map((v) => new Map(HashMap.entries(v))),
							),
						};
					}),
			).pipe(requestResolverServices);

			const CreateResourceConstantResolver = RequestResolver.fromEffect(
				(r: Request.CreateResourceConstant) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;
						const project = yield* editor.project;

						yield* editor.package(r.pkg).pipe(
							Effect.flatten,
							Effect.catchTag(
								"NoSuchElementException",
								() => new Package.NotFound({ id: r.pkg }),
							),
						);

						const name = "New Constant";
						const id = Math.random().toString();

						yield* editor.modifyProject(
							() =>
								new Project.Project({
									...project,
									constants: HashMap.set(project.constants, id, {
										name,
										type: "resource",
										pkg: r.pkg,
										resource: r.resource,
									}),
								}),
						);

						return yield* editor.publishEvent(
							new ProjectEvent.ResourceConstantCreated({
								pkg: r.pkg,
								resource: r.resource,
								name,
								id,
								value: Option.none(),
							}),
						);
					}),
			).pipe(requestResolverServices);

			const UpdateResourceConstantResolver = RequestResolver.fromEffect(
				(r: Request.UpdateResourceConstant) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;

						// TODO: Validate resource value

						yield* editor.modifyProject(
							(p) =>
								new Project.Project({
									...p,
									constants: HashMap.modify(p.constants, r.id, (constant) => ({
										...constant,
										value: r.value ?? constant.value,
										name: r.name ?? constant.name,
									})),
								}),
						);

						return yield* editor.publishEvent(
							new ProjectEvent.ResourceConstantUpdated({
								id: r.id,
								value: r.value,
								name: r.name,
							}),
						);
					}),
			).pipe(requestResolverServices);

			const DeleteResourceConstantResolver = RequestResolver.fromEffect(
				(r: Request.DeleteResourceConstant) =>
					Effect.gen(function* () {
						const editor = yield* ProjectEditor;
						const project = yield* editor.project;

						yield* editor.modifyProject(
							() =>
								new Project.Project({
									...project,
									constants: HashMap.remove(project.constants, r.id),
								}),
						);

						return yield* editor.publishEvent(
							new ProjectEvent.ResourceConstantDeleted({ id: r.id }),
						);
					}),
			).pipe(requestResolverServices);

			return {
				CreateGraphResolver,
				GetProjectResolver,
				CreateResourceConstantResolver,
				UpdateResourceConstantResolver,
				DeleteResourceConstantResolver,
			};
		}),
	},
) {}
