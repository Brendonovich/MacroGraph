import {
	Effect,
	HashMap,
	Iterable,
	Option,
	PubSub,
	pipe,
	Stream,
} from "effect";
import type { Package as SDKPackage } from "@macrograph/package-sdk";
import { ForceRetryError, type NodeSchema } from "@macrograph/project-domain";
import {
	Credential,
	Package,
	ProjectEvent,
	Schema,
} from "@macrograph/project-domain/updated";

import { CloudApiClient } from "./CloudApi.ts";
import * as CredentialsStore from "./CredentialsStore.ts";
import { NodeExecution } from "./NodeExecution.ts";
import * as ProjectRuntime from "./ProjectRuntime.ts";

export class PackageActions extends Effect.Service<PackageActions>()(
	"PackageActions",
	{
		effect: Effect.gen(function* () {
			const nodeExecution = yield* NodeExecution;

			const getSchema = Effect.fnUntraced(function* (schema: Schema.Ref) {
				const runtime = yield* ProjectRuntime.Current;

				return yield* Option.fromNullable(
					runtime.packages.get(schema.pkg),
				).pipe(
					Effect.catchAll(() => new Package.NotFound({ id: schema.pkg })),
					Effect.flatMap((pkg) =>
						Option.fromNullable(pkg.schemas.get(schema.id)),
					),
					Effect.catchAll(() => new Schema.NotFound(schema)),
				);
			});

			return {
				getSchema,
				loadPackage: Effect.fnUntraced(function* <T>(
					_id: string,
					unbuiltPkg: SDKPackage.UnbuiltPackage<T>,
				) {
					const runtime = yield* ProjectRuntime.Current;
					const credentials = yield* CredentialsStore.CredentialsStore;

					const schemas = new Map<Schema.Id, NodeSchema>();
					const id = Package.Id.make(_id);

					unbuiltPkg.builder({
						schema: (id, schema) =>
							schemas.set(Schema.Id.make(id), {
								...schema,
								run: Effect.fn(schema.run as any),
							} as NodeSchema),
					});

					const engine = yield* Option.fromNullable(unbuiltPkg.engine).pipe(
						Option.map((engine) =>
							Effect.gen(function* () {
								const cloud = yield* CloudApiClient.CloudApiClient;
								const credentialLatch = yield* Effect.makeLatch(true);

								const events = yield* PubSub.unbounded<T>();

								const builtEngine = engine.builder({
									credentials: credentials.get.pipe(
										Effect.catchAll(() => new Credential.FetchFailed()),
									),
									emitEvent: (e) => events.offer(e),
									refreshCredential: (providerId, providerUserId) =>
										Effect.gen(function* () {
											yield* credentialLatch.close;

											yield* cloud
												.refreshCredential({
													path: { providerId, providerUserId },
												})
												.pipe(Effect.catchAll(() => Effect.void));
											yield* credentials.refresh.pipe(
												Effect.catchAll(Effect.die),
											);

											return yield* new ForceRetryError();
										}).pipe(Effect.ensuring(credentialLatch.open)),
									dirtyState: runtime.events.offer(
										new ProjectEvent.PackageStateChanged({ pkg: id }),
									),
								});

								yield* events.pipe(
									(e) => Stream.fromPubSub(e),
									Stream.runForEach((e) =>
										Effect.gen(function* () {
											const project = yield* runtime.projectRef;

											for (const graph of HashMap.values(project.graphs)) {
												for (const node of HashMap.values(graph.nodes)) {
													const schema = yield* getSchema(node.schema).pipe(
														Effect.catchTag("Schema/NotFound", () =>
															Effect.succeed(null),
														),
													);
													if (schema?.type !== "event") continue;

													yield* nodeExecution
														.fireEventNode(graph.id, node.id, e)
														.pipe(Effect.fork);
												}
											}
										}).pipe(
											Effect.withSpan("Package.Event", {
												root: true,
												attributes: { package: id, event: e },
											}),
											Effect.catchAllDefect(Effect.logError),
										),
									),
									Effect.forkScoped,
								);

								return { ...builtEngine, events, def: engine.def };
							}),
						),
						Effect.transposeOption,
					);

					runtime.packages.set(id, {
						id,
						name: unbuiltPkg.name,
						schemas,
						engine,
					});

					const pkg = new Package.Package({
						id,
						name: unbuiltPkg.name,
						schemas: pipe(
							schemas.entries(),
							Iterable.map(
								([id, schema]) =>
									[
										id,
										{
											id,
											name: schema.name,
											type: schema.type,
											properties: Object.entries(schema.properties ?? {}).map(
												([id, property]) => ({
													id,
													name: property.name,
													resource: property.resource.id,
												}),
											),
										},
									] as const,
							),
							(v) => new Map(v),
						),
						resources: engine.pipe(
							Option.map((e) =>
								pipe(
									e.def.resources ?? [],
									Iterable.map(
										(resource) =>
											[resource.id, { name: resource.name }] as const,
									),
									(i) => new Map(i),
								),
							),
							Option.getOrElse(() => new Map()),
						),
					});

					const event = new ProjectEvent.PackageAdded({ pkg });

					yield* runtime.events.offer(event);

					return event;
				}),
			};
		}),
		dependencies: [NodeExecution.Default],
	},
) {}
