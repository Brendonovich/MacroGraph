import { RpcSerialization, RpcServer } from "@effect/rpc";
import {
	Context,
	Iterable,
	Layer,
	Mailbox,
	Option,
	PubSub,
	pipe,
	Schema,
	Stream,
} from "effect";
import * as Effect from "effect/Effect";
import type { ParseError } from "effect/ParseResult";
import type { Graph, Node } from "@macrograph/project-domain";
import {
	CredentialsFetchFailed,
	DataInputRef,
	DataOutputRef,
	ExecInputRef,
	ExecOutputRef,
	ExecutionContext,
	ForceRetryError,
	type IOId,
	type IORef,
	NodeExecutionContext,
	type NodeSchema,
	NotComputationNode,
	NotEventNode,
	PackageBuilder,
	SubscribableCache,
} from "@macrograph/project-domain";

// import { RealtimePubSub } from "../Realtime";
import type { Package } from "../../../package-sdk/src";
import { CloudApi } from "../CloudApi";
import { Credentials } from "../Credentials";
import { ProjectData, ProjectShape } from "./Data";
import { ProjectPackages } from "./Packages";

export class ProjectRuntime extends Effect.Service<ProjectRuntime>()(
	"ProjectRuntime",
	{
		effect: Effect.gen(function* () {
			const project = yield* ProjectData;
			// const logger = yield* Logger;
			const cloud = yield* CloudApi;
			const credentials = yield* Credentials;
			// const realtime = yield* RealtimePubSub;
			const packages = yield* ProjectPackages;

			const getNode = (graphId: Graph.Id, id: Node.Id) =>
				Option.fromNullable(
					project.graphs.get(graphId)?.nodes.find((n) => n.id === id),
				);

			const getGraph = (graphId: Graph.Id) =>
				Option.fromNullable(project.graphs.get(graphId));

			const getPackage = (pkgId: string) =>
				Option.fromNullable(packages.get(pkgId));

			const eventNodes = new Map<Graph.Id, Map<string, Set<Node.Id>>>();

			type SchemaRef = {
				pkgId: string;
				schemaId: string;
			};

			const getSchema = (schemaRef: SchemaRef) =>
				Option.fromNullable(
					packages.get(schemaRef.pkgId)?.pkg.schemas.get(schemaRef.schemaId),
				);

			const getInputConnections = (
				graphId: Graph.Id,
				nodeId: Node.Id,
				inputId: IOId,
			) =>
				getGraph(graphId).pipe(
					Option.andThen((graph) =>
						Option.fromNullable(
							graph.connections?.get(nodeId)?.in?.get(inputId),
						),
					),
					Option.getOrElse(() => []),
				);

			const getOutputConnections = (
				graphId: Graph.Id,
				nodeId: Node.Id,
				inputId: IOId,
			) =>
				getGraph(graphId).pipe(
					Option.andThen((graph) =>
						Option.fromNullable(
							graph.connections?.get(nodeId)?.out?.get(inputId),
						),
					),
					Option.getOrElse(() => []),
				);

			const runNode = Effect.fn(function* (graphId: Graph.Id, nodeId: Node.Id) {
				const node = yield* getNode(graphId, nodeId);
				const schema = yield* getSchema(node.schema);

				if (schema.type === "event") return yield* new NotComputationNode();

				const io = schema.io({
					out: {
						exec: (id) => new ExecOutputRef(id as IOId),
						data: (id, type) => new DataOutputRef(id, type),
					},
					in: {
						exec: (id) => new ExecInputRef(id),
						data: (id, type) => new DataInputRef(id as IOId, type),
					},
				});

				return yield* schema.run({ io, properties: {} }).pipe(
					Effect.map((v) => Option.fromNullable(v ?? undefined)),
					Effect.map(Option.map((output) => ({ output, node }))),
					Effect.provide(NodeExecutionContext.context({ node })),
				);
			});

			const connectionForExecOutput = Effect.fn(function* (
				graphId: Graph.Id,
				ref: ExecOutputRef,
			) {
				const { node } = yield* NodeExecutionContext;
				return Option.fromNullable(
					getOutputConnections(graphId, node.id, ref.id)[0],
				);
			});

			const connectionForDataInput = Effect.fn(function* (
				graphId: Graph.Id,
				ref: DataInputRef<any>,
			) {
				const { node } = yield* NodeExecutionContext;
				return Option.fromNullable(
					getInputConnections(graphId, node.id, ref.id)[0],
				);
			});

			const runEventNode = Effect.fn(function* (
				graphId: Graph.Id,
				eventNode: Node.Shape,
				schema: Extract<NodeSchema<any, any, any>, { type: "event" }>,
				data: unknown,
			) {
				const io = schema.io({
					out: {
						exec: (id) => new ExecOutputRef(id as IOId),
						data: (id, type) => new DataOutputRef(id, type),
					},
				});

				let ret = yield* schema.run({ io, properties: {} }, data).pipe(
					Effect.map((v) => Option.fromNullable(v ?? undefined)),
					Effect.map(Option.map((output) => ({ output, node: eventNode }))),
					Effect.provide(NodeExecutionContext.context({ node: eventNode })),
				);

				while (Option.isSome(ret)) {
					const { output, node } = ret.value;

					ret = yield* pipe(
						yield* connectionForExecOutput(graphId, output).pipe(
							Effect.provide(Context.make(NodeExecutionContext, { node })),
						),
						Option.andThen((ref) =>
							runNode(graphId, ref[0]).pipe(
								Effect.withSpan("ExecuteNode", {
									attributes: { graphId, nodeId: node.id },
								}),
							),
						),
						Effect.transposeOption,
						Effect.map(Option.flatten),
					);
				}
			});

			const tryExecuteEventNode = Effect.fn(function* (
				graphId: Graph.Id,
				nodeId: Node.Id,
				data: any,
			) {
				const eventNode = yield* getNode(graphId, nodeId);
				const pkg = yield* getPackage(eventNode.schema.pkgId);
				const schema = yield* getSchema(eventNode.schema);

				if (schema.type !== "event") return yield* new NotEventNode();

				const properties: Record<string, any> = {};

				if (schema.properties) {
					for (const [name, def] of Object.entries(schema.properties ?? {})) {
						console.log({ name, def });
						const resource = pkg.resources.get(def.resource);
						if (!resource) {
							yield* Effect.log(
								`Resource '${pkg.pkg.id}/${def.resource.id}' not found`,
							);
							return false;
						}

						const values = yield* resource.get;
						const value = values[0];
						if (!value) {
							yield* Effect.log(
								`No value for resource '${pkg.pkg.id}/${def.resource.id}' found`,
							);
							return false;
						}
						properties[name] = value;
					}
				}

				const eventData = schema.event({ properties }, data);
				if (eventData === undefined) return false;

				yield* Effect.gen(function* () {
					const outputData: Map<Node.Id, Record<string, any>> = new Map();

					const getData = (io: IORef) =>
						Option.fromNullable(outputData.get(io.nodeId)?.[io.ioId]);

					const execCtx = ExecutionContext.context({
						traceId: Math.random().toString(),
						getInput: (input) =>
							Effect.gen(function* () {
								const connection = yield* connectionForDataInput(
									graphId,
									input,
								);
								if (Option.isNone(connection)) return "Value";
								const data = getData({
									nodeId: connection.value[0],
									ioId: connection.value[1],
								});
								if (Option.isSome(data)) return data.value;
								yield* runNode(graphId, connection.value[0]).pipe(
									Effect.catchTag(
										"@macrograph/project-domain/NotComputationNode",
										() =>
											Effect.die(
												new Error(
													"Cannot get input for a non-computation node",
												),
											),
									),
								);
								return getData({
									nodeId: connection.value[0],
									ioId: connection.value[1],
								}).pipe(Option.getOrThrow);
							}),
						setOutput: (output, data) =>
							Effect.gen(function* () {
								const { node } = yield* NodeExecutionContext;
								let nodeOutputData = outputData.get(node.id);
								if (!nodeOutputData) {
									nodeOutputData = {};
									outputData.set(node.id, nodeOutputData);
								}
								nodeOutputData[output.id] = data;
							}),
						// getProperty: () => {
						// 	throw new Error("TODO");
						// },
					});

					yield* runEventNode(graphId, eventNode, schema, eventData).pipe(
						Effect.provide(execCtx),
					);
				}).pipe(
					Effect.withSpan("FireEventNode", { attributes: { graphId, nodeId } }),
				);

				return true;
			});

			const addPackage = (
				id: string,
				unbuiltPkg: Package.UnbuiltPackage<any>,
			) =>
				Effect.gen(function* () {
					const credentialLatch = yield* Effect.makeLatch(true);

					const getCredentials = credentialLatch
						.whenOpen(credentials.get)
						.pipe(Effect.map((c) => c.filter((c) => c.provider === id)));

					const builder = new PackageBuilder(id, unbuiltPkg.name);

					unbuiltPkg.builder({
						schema: (id, schema) => builder.schema(id, schema as any),
					});

					let rpcServer, state, rpc;

					const resources = new Map();

					if (unbuiltPkg.engine) {
						const stateBroadcast = yield* PubSub.unbounded<void>();
						const engine = unbuiltPkg.engine;

						const events = yield* Mailbox.make<{
							event: any;
							// span: Tracer.Span;
						}>();

						const ret = engine.builder({
							dirtyState: stateBroadcast.publish(),
							credentials: getCredentials.pipe(
								Effect.catchAll(
									(e) => new CredentialsFetchFailed({ message: e.toString() }),
								),
							),
							refreshCredential: (providerId, providerUserId) =>
								Effect.gen(function* () {
									yield* credentialLatch.close;

									yield* cloud.client
										.refreshCredential({
											path: { providerId, providerUserId },
										})
										.pipe(Effect.catchAll(Effect.die));
									yield* credentials.refresh.pipe(Effect.catchAll(Effect.die));

									return yield* new ForceRetryError();
								}).pipe(Effect.ensuring(credentialLatch.open)),
							emitEvent: (data) => {
								events.unsafeOffer({ event: data });
							},
						});

						if (ret.state) {
							yield* credentials.changes().pipe(
								Stream.runForEach(() => stateBroadcast.publish()),
								Effect.ensuring(Effect.log("credentials listener changed")),
								Effect.forkScoped,
							);

							state = {
								get: ret.state,
								changes: stateBroadcast.subscribe,
							};
						}

						if (engine.def.rpc && ret.rpc) {
							rpc = {
								defs: engine.def.rpc,
								layer: ret.rpc,
							};

							rpcServer = yield* RpcServer.toHttpApp(engine.def.rpc, {
								spanPrefix: `PackageRpc.${id}`,
							}).pipe(
								Effect.provide(
									Layer.mergeAll(
										ret.rpc,
										RpcServer.layerProtocolHttp({ path: "/" }),
									),
								),
								Effect.provide(RpcSerialization.layerJson),
							);
						}

						yield* Mailbox.toStream(events).pipe(
							Stream.runForEach(({ event }) =>
								Effect.gen(function* () {
									for (const [graphId, graphEventNodes] of eventNodes) {
										const packageEventNodes = graphEventNodes.get(id);
										if (!packageEventNodes) continue;

										for (const nodeId of packageEventNodes) {
											yield* tryExecuteEventNode(graphId, nodeId, event).pipe(
												// Effect.provide(Context.make(Logger, logger)),
												Effect.fork,
											);
										}
									}
								}).pipe(
									Effect.withSpan("Package.Event", {
										root: true,
										attributes: { package: id, event },
									}),
								),
							),
							Effect.forkScoped,
						);

						for (const resource of unbuiltPkg.engine.def.resources ?? []) {
							const impl = yield* resource.tag.pipe(
								Effect.provide(ret.resources),
							);

							resources.set(
								resource,
								yield* SubscribableCache.make({
									capacity: 1,
									timeToLive: "1 minute",
									lookup: impl.get,
								}),
							);
						}
					}

					const pkg = builder.toPackage();

					packages.set(pkg.id, {
						pkg,
						state: Option.fromNullable(state),
						rpcServer: Option.fromNullable(rpcServer),
						rpc: Option.fromNullable(rpc as any),
						resources,
					});
				});

			const load = Effect.fnUntraced(function* (v: ProjectShape) {});

			return { addPackage, load, data: Effect.sync(() => project) };
		}),
		dependencies: [
			Credentials.Default,
			CloudApi.Default,
			ProjectPackages.Default,
			// RealtimePubSub.Default,
		],
	},
) {}

class EventNodeRegistry {
	eventNodes = new Map<Graph.Id, Map<string, Set<Node.Id>>>();

	registerNode(graphId: Graph.Id, nodeId: Node.Id, packageId: string) {
		const graphEventNodes =
			this.eventNodes.get(graphId) ??
			(() => {
				const nodes = new Map<string, Set<Node.Id>>();
				this.eventNodes.set(graphId, nodes);
				return nodes;
			})();

		const packageEventNodes =
			graphEventNodes.get(packageId) ??
			(() => {
				const nodes = new Set<Node.Id>();
				graphEventNodes.set(packageId, nodes);
				return nodes;
			})();

		packageEventNodes.add(nodeId);
	}

	unregisterNode(graphId: Graph.Id, nodeId: Node.Id, packageId: string) {
		const graphEventNodes = eventNodes.get(graphId);
		if (!graphEventNodes) return;

		const packageEventNodes = graphEventNodes.get(packageId);
		if (!packageEventNodes) return;

		packageEventNodes.delete(nodeId);
	}

	lookup(packageId: string) {
		return pipe(
			this.eventNodes.entries(),
			Iterable.filterMap(([graphId, nodes]) =>
				Option.fromNullable(nodes.get(packageId)).pipe(
					Option.map((nodes) => ({ graphId, nodes: nodes.values() }) as const),
				),
			),
		);
	}
}

export const makeRuntime = Effect.fnUntraced(function* (
	v: Schema.Schema.Encoded<typeof ProjectShape>,
) {
	const state = yield* Schema.decode(ProjectShape)(v);

	const eventNodes = new EventNodeRegistry();

	const handleEvent = Effect.fnUntraced(function* (pkgId: string, event: any) {
		for (const { graphId, nodes } of eventNodes.lookup(pkgId)) {
			for (const nodeId of nodes) {
				yield* Effect.log({ nodeId });
				// yield* Effect.void;
			}
		}
	});

	const runtime: Runtime = {
		handleEvent,
		serialize: () => Schema.encode(ProjectShape)(state),

		modify: (cb) => cb(state),
	};

	return runtime;
});

interface Runtime {
	handleEvent(pkgId: string, event: any): Effect.Effect<void>;
	serialize(): Effect.Effect<
		Schema.Schema.Encoded<typeof ProjectShape>,
		ParseError
	>;

	modify(cb: (v: ProjectShape) => void): void;
}
