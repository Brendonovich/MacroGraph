import {
	Effect,
	// HashMap,
	Iterable,
	// identity,
	Option,
	// PubSub,
	pipe,
	Record,
	RequestResolver,
	// Record,
	// Stream,
} from "effect";
// import { UnknownException } from "effect/Cause";
import type {
	PackageEngine,
	Package as SDKPackage,
} from "@macrograph/package-sdk";
import {
	Actor,
	Package,
	ProjectEvent,
	type Request,
	type Schema,
} from "@macrograph/project-domain";

// import { requestResolverServices } from "../Requests";
// import { CloudApiClient } from "./CloudApi.ts";
// import * as CredentialsStore from "./CredentialsStore.ts";
import { NodeExecution } from "./NodeExecution.ts";
import * as ProjectRuntime from "./ProjectRuntime.ts";

export class PackageActions extends Effect.Service<PackageActions>()(
	"PackageActions",
	{
		effect: Effect.gen(function* () {
			// const nodeExecution = yield* NodeExecution;

			const getSchema = Effect.fnUntraced(function* (schema: Schema.Ref) {
				return Option.none();
				// const runtime = yield* ProjectRuntime.Current;

				// return yield* Option.fromNullable(
				// 	runtime.packages.get(schema.pkg),
				// ).pipe(
				// 	Effect.catchAll(() => new Package.NotFound({ id: schema.pkg })),
				// 	Effect.flatMap((pkg) =>
				// 		Option.fromNullable(pkg.schemas.get(schema.id)),
				// 	),
				// 	Effect.catchAll(() => new Schema.NotFound(schema)),
				// );
			});

			const GetPackageSettingsResolver = RequestResolver.fromEffect(
				(r: Request.GetPackageSettings) =>
					Effect.gen(function* () {
						return new Package.NotFound({ id: r.package });
						// const runtime = yield* ProjectRuntime.Current;

						// return yield* Option.fromNullable(
						// 	runtime.packages.get(r.package),
						// ).pipe(
						// 	Option.flatMap((p) => p.engine),
						// 	Effect.flatMap((e) => e.state),
						// 	Effect.catchTag(
						// 		"NoSuchElementException",
						// 		() => new Package.NotFound({ id: r.package }),
						// 	),
						// );
					}),
			);
			// .pipe(requestResolverServices);

			return {
				getSchema,
				loadPackage: Effect.fnUntraced(function* <
					Engine extends PackageEngine.Any,
				>(
					rawId: string,
					pkg: SDKPackage.Package<Engine>,
					// _layer: PackageEngine.LayerBuilderRet<Engine>,
				) {
					// const runtime = yield* ProjectRuntime.Current;
					// const credentials = yield* CredentialsStore.CredentialsStore;

					const id = Package.Id.make(rawId);

					// const engine = yield* Option.fromNullable(pkg.engine).pipe(
					// 	Option.map((engine) =>
					// 		Effect.gen(function* () {
					// 			const cloud = yield* CloudApiClient.CloudApiClient;
					// 			const credentialLatch = yield* Effect.makeLatch(true);

					// 			const events = yield* PubSub.unbounded<T>();

					// 			const builtEngine = engine.builder({
					// 				credentials: credentials.get.pipe(
					// 					Effect.catchAll(() => new Credential.FetchFailed()),
					// 				),
					// 				emitEvent: (e) => events.offer(e),
					// 				refreshCredential: (providerId, providerUserId) =>
					// 					Effect.gen(function* () {
					// 						yield* credentialLatch.close;

					// 						yield* cloud
					// 							.refreshCredential({
					// 								path: { providerId, providerUserId },
					// 							})
					// 							.pipe(Effect.catchAll((e) => new UnknownException(e)));
					// 						yield* credentials.refresh.pipe(
					// 							Effect.catchAll(Effect.die),
					// 						);
					// 					}).pipe(Effect.ensuring(credentialLatch.open)),
					// 				dirtyState: ProjectRuntime.publishEvent(
					// 					new ProjectEvent.PackageStateChanged({ pkg: id }),
					// 				).pipe(
					// 					Effect.provide(Actor.layerSystem),
					// 					Effect.provideService(ProjectRuntime.Current, runtime),
					// 				),
					// 				dirtyResources: Effect.suspend(() =>
					// 					updateResources.pipe(Effect.fork),
					// 				),
					// 			});

					// 			const getResourceValues = (id: string) =>
					// 				Option.fromNullable(
					// 					engine.def.resources?.find((r) => r.id === id),
					// 				).pipe(
					// 					Option.map((def) =>
					// 						Effect.gen(function* () {
					// 							const handler = yield* def.tag;
					// 							return (yield* handler.get).map(def.serialize);
					// 						}).pipe(Effect.provide(builtEngine.resources)),
					// 					),
					// 					Effect.transposeOption,
					// 				);

					// 			yield* events.pipe(
					// 				(e) => Stream.fromPubSub(e),
					// 				Stream.runForEach((e) =>
					// 					Effect.gen(function* () {
					// 						const project = yield* runtime.projectRef;

					// 						for (const graph of HashMap.values(project.graphs)) {
					// 							for (const node of HashMap.values(graph.nodes)) {
					// 								const schema = yield* getSchema(node.schema).pipe(
					// 									Effect.catchTag("Schema/NotFound", () =>
					// 										Effect.succeed(null),
					// 									),
					// 								);
					// 								if (schema?.type !== "event") continue;

					// 								yield* nodeExecution
					// 									.fireEventNode(graph.id, node.id, e)
					// 									.pipe(Effect.fork);
					// 							}
					// 						}
					// 					}).pipe(
					// 						Effect.withSpan("Package.Event", {
					// 							root: true,
					// 							attributes: { package: id, event: e },
					// 						}),
					// 						Effect.catchAllDefect(Effect.logError),
					// 					),
					// 				),
					// 				Effect.forkScoped,
					// 			);

					// 			const updateResources = Effect.gen(function* () {
					// 				const resources = yield* pipe(
					// 					engine.def.resources ?? [],
					// 					Iterable.map((r) =>
					// 						getResourceValues(r.id).pipe(
					// 							Effect.map(Option.map((v) => [r.id, v] as const)),
					// 						),
					// 					),
					// 					Effect.all,
					// 					Effect.map(Iterable.filterMap(identity)),
					// 					Effect.map(Record.fromEntries),
					// 				);

					// 				yield* ProjectRuntime.publishEvent(
					// 					new ProjectEvent.PackageResourcesUpdated({
					// 						package: id,
					// 						resources,
					// 					}),
					// 				).pipe(
					// 					Effect.provide(Actor.layerSystem),
					// 					Effect.provideService(ProjectRuntime.Current, runtime),
					// 				);
					// 			});

					// 			yield* credentials.changes().pipe(
					// 				Stream.runForEach(() => updateResources.pipe(Effect.ignore)),
					// 				Effect.forkScoped,
					// 			);

					// 			return {
					// 				...builtEngine,
					// 				events,
					// 				def: engine.def,
					// 				getResourceValues,
					// 				updateResources,
					// 			};
					// 		}),
					// 	),
					// 	Effect.transposeOption,
					// );

					// runtime.packages.set(id, pkg);

					// const pkgClass = new Package.Package({
					// 	id,
					// 	name: pkg.name,
					// 	schemas: pipe(
					// 		pkg.schemas.entries(),
					// 		Iterable.map(
					// 			([id, schema]) =>
					// 				[
					// 					Schema.Id.make(id),
					// 					{
					// 						id: Schema.Id.make(id),
					// 						name: schema.name,
					// 						type: schema.type,
					// 						properties: [],
					// 						// Object.entries(schema.properties ?? {}).map(
					// 						// 	([id, property]) => ({
					// 						// 		id,
					// 						// 		name: property.name,
					// 						// 		resource: property.resource.id,
					// 						// 	}),
					// 						// ),
					// 					},
					// 				] as const,
					// 		),
					// 		(v) => new Map(v),
					// 	),
					// 	resources: Option.fromNullable(pkg.engine?.resources).pipe(
					// 		Option.map((resources) =>
					// 			Record.fromEntries(
					// 				resources.map((r) => [r.id, { name: r.name_, values: [] }]),
					// 			),
					// 		),
					// 		Option.getOrElse(() => ({})),
					// 	),
					// });

					// yield* ProjectRuntime.publishEvent(
					// 	new ProjectEvent.PackageAdded({ pkg: pkgClass }),
					// ).pipe(
					// 	Effect.provide(Actor.layerSystem),
					// 	Effect.provideService(ProjectRuntime.Current, runtime),
					// );
				}),
				getPackageSettings: Effect.request<
					Request.GetPackageSettings,
					typeof GetPackageSettingsResolver
				>(GetPackageSettingsResolver),
			};
		}),
		dependencies: [NodeExecution.Default],
	},
) {}
