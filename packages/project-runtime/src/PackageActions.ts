import {
	Effect,
	HashMap,
	Iterable,
	identity,
	Option,
	PubSub,
	pipe,
	Record,
	Stream,
} from "effect";
import { UnknownException } from "effect/Cause";
import type { Package as SDKPackage } from "@macrograph/package-sdk";
import type {
	ExecInput,
	ExecOutput,
	IOFunctionContext,
	NodeSchema,
} from "@macrograph/project-domain";
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
					rawId: string,
					unbuiltPkg: SDKPackage.UnbuiltPackage<T>,
				) {
					const runtime = yield* ProjectRuntime.Current;
					const credentials = yield* CredentialsStore.CredentialsStore;

					const schemas = new Map<Schema.Id, NodeSchema>();
					const id = Package.Id.make(rawId);

					unbuiltPkg.builder({
						schema: (id, schema) => {
							const run = Effect.fn(schema.run as any);

							schemas.set(Schema.Id.make(id), {
								...schema,
								io: (ctx: IOFunctionContext) => {
									const baseIO: Array<ExecInput | ExecOutput> = [];
									if (schema.type === "event") {
										ctx.out.exec("exec");
									} else if (schema.type === "exec") {
										ctx.out.exec("exec");
										ctx.in.exec("exec");
									}

									return [baseIO, schema.io(ctx)];
								},
								run: Effect.fnUntraced(function* (ctx: any, data) {
									const ret = yield* run({ ...ctx, io: ctx.io[1] }, data);

									if (schema.type === "event" || schema.type === "exec") {
										return ctx.io[0][0];
									}

									return ret;
								}),
							} as NodeSchema);
						},
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
												.pipe(Effect.catchAll((e) => new UnknownException(e)));
											yield* credentials.refresh.pipe(
												Effect.catchAll(Effect.die),
											);
										}).pipe(Effect.ensuring(credentialLatch.open)),
									dirtyState: runtime.events.offer(
										new ProjectEvent.PackageStateChanged({ pkg: id }),
									),
									dirtyResources: Effect.suspend(() =>
										updateResources.pipe(Effect.fork),
									),
								});

								const getResourceValues = (id: string) =>
									Option.fromNullable(
										engine.def.resources?.find((r) => r.id === id),
									).pipe(
										Option.map((def) =>
											Effect.gen(function* () {
												const handler = yield* def.tag;
												return (yield* handler.get).map(def.serialize);
											}).pipe(Effect.provide(builtEngine.resources)),
										),
										Effect.transposeOption,
									);

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

								const updateResources = Effect.gen(function* () {
									const resources = yield* pipe(
										engine.def.resources ?? [],
										Iterable.map((r) =>
											getResourceValues(r.id).pipe(
												Effect.map(Option.map((v) => [r.id, v] as const)),
											),
										),
										Effect.all,
										Effect.map(Iterable.filterMap(identity)),
										Effect.map(Record.fromEntries),
									);

									yield* runtime.events.offer(
										new ProjectEvent.PackageResourcesUpdated({
											package: id,
											resources,
										}),
									);
								});

								yield* credentials.changes().pipe(
									Stream.runForEach(() => updateResources.pipe(Effect.ignore)),
									Effect.forkScoped,
								);

								return {
									...builtEngine,
									events,
									def: engine.def,
									getResourceValues,
									updateResources,
								};
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
						resources: yield* engine.pipe(
							Option.map((e) =>
								pipe(
									e.def.resources ?? [],
									Iterable.map((r) =>
										e
											.getResourceValues(r.id)
											.pipe(
												Effect.option,
												Effect.map(Option.flatten),
												Effect.map(
													Option.map(
														(values) =>
															[r.id, { name: r.name, values }] as const,
													),
												),
											),
									),
									Effect.all,
									Effect.map(Iterable.filterMap(identity)),
									Effect.map(Record.fromEntries),
								),
							),
							Effect.transposeOption,
							Effect.map(Option.getOrElse(Record.empty)),
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
