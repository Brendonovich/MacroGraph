import { Rpc, RpcSerialization, RpcServer } from "@effect/rpc";
import {
  Context,
  Mailbox,
  Option,
  pipe,
  Stream,
  SubscriptionRef,
  Tracer,
} from "effect";
import * as Effect from "effect/Effect";

import type { NodeSchema } from "../../schema";
import {
  CredentialsFetchFailed,
  ForceRetryError,
  PackageBuilder,
  PackageEngine,
} from "../../package";
import { ExecutionContext, NodeExecutionContext } from "../../Runtime";
import {
  DataInputRef,
  DataOutputRef,
  ExecInputRef,
  ExecOutputRef,
  IOId,
} from "../../io";
import { NodeNotFound, NotComputationNode, NotEventNode } from "../../errors";
import { Node, NodeId, NodeIO } from "../Node/data";
import { NodeConnections, project } from "../../project";
import { RealtimePubSub } from "../Realtime/PubSub";
import { CloudAPIClient } from "../CloudApi/ApiClient";
import { GraphId } from "../Graph/data";
import { CredentialsCache } from "../CloudApi/CredentialsCache";
import { ProjectPackages } from "./Packages";
import { GraphNotFoundError } from "../Graph/error";
import { getNextNodeId } from "./NodeIdCounter";
import { Package } from "../../package-utils";

export class ProjectActions extends Effect.Service<ProjectActions>()(
  "ProjectActions",
  {
    effect: Effect.gen(function* () {
      // const logger = yield* Logger;
      const credentials = yield* CredentialsCache;
      const apiClient = yield* CloudAPIClient;
      const realtime = yield* RealtimePubSub;
      const packages = yield* ProjectPackages;

      // const nodes = new Map<number, Node>();

      const getNode = (graphId: GraphId, id: NodeId) =>
        Option.fromNullable(
          project.graphs.get(graphId)?.nodes.find((n) => n.id === id),
        );

      const getGraph = (graphId: GraphId) =>
        Option.fromNullable(project.graphs.get(graphId));

      const getPackage = (pkgId: string) =>
        Option.fromNullable(packages.get(pkgId));

      const eventNodes = new Map<GraphId, Map<string, Set<NodeId>>>();

      type SchemaRef = {
        pkgId: string;
        schemaId: string;
      };

      const getSchema = (schemaRef: SchemaRef) =>
        Option.fromNullable(
          packages.get(schemaRef.pkgId)?.pkg.schemas.get(schemaRef.schemaId),
        );

      const createNode = (
        graphId: GraphId,
        schemaRef: SchemaRef,
        position: [number, number],
      ) =>
        Effect.gen(function* () {
          const schema = yield* getSchema(schemaRef);
          const graph = project.graphs.get(graphId);
          if (!graph) return yield* new GraphNotFoundError({ graphId });

          const io: DeepWriteable<NodeIO> = {
            inputs: [],
            outputs: [],
          };

          schema.io({
            out: {
              exec: (id) => {
                io.outputs.push({ id, variant: "exec" });
                return new ExecOutputRef(id as IOId);
              },
              data: (id, type) => {
                io.outputs.push({ id, variant: "data", data: "string" });
                return new DataOutputRef(id, type);
              },
            },
            in: {
              exec: (id) => {
                io.inputs.push({ id, variant: "exec" });
                return new ExecInputRef(id);
              },
              data: (id, type) => {
                io.inputs.push({ id, variant: "data", data: "string" });
                return new DataInputRef(id as IOId, type);
              },
            },
          });

          const node: DeepWriteable<Node> = {
            schema: schemaRef,
            id: getNextNodeId(),
            inputs: io.inputs,
            outputs: io.outputs,
            position: { x: position[0], y: position[1] },
          };

          if (schema.type === "event") {
            let graphEventNodes =
              eventNodes.get(graphId) ??
              (() => {
                const nodes = new Map<string, Set<NodeId>>();
                eventNodes.set(graphId, nodes);
                return nodes;
              })();

            const packageEventNodes =
              graphEventNodes.get(schemaRef.pkgId) ??
              (() => {
                const nodes = new Set<NodeId>();
                graphEventNodes.set(schemaRef.pkgId, nodes);
                return nodes;
              })();

            packageEventNodes.add(node.id);
          }

          graph.nodes.push(node);

          return node;
        });

      type IORef = { nodeId: NodeId; ioId: string };

      const getInputConnections = (
        graphId: GraphId,
        nodeId: NodeId,
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
        graphId: GraphId,
        nodeId: NodeId,
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

      const addConnection = Effect.fn(function* (
        graphId: GraphId,
        output: IORef,
        input: IORef,
      ) {
        const graph = project.graphs.get(graphId);
        if (!graph) return yield* new GraphNotFoundError({ graphId });
        const connections = (graph.connections ??= new Map() as NonNullable<
          typeof graph.connections
        >);

        if (Option.isNone(getNode(graphId, output.nodeId)))
          return yield* new NodeNotFound(output);
        if (Option.isNone(getNode(graphId, input.nodeId)))
          return yield* new NodeNotFound(input);

        const upsertNodeConnections = (nodeId: NodeId) =>
          connections.get(nodeId) ??
          (() => {
            const v: NodeConnections = {};
            connections.set(nodeId, v);
            return v;
          })();

        let outputNodeConnections = upsertNodeConnections(output.nodeId);

        outputNodeConnections.out ??= new Map();
        let outputNodeInputConnections =
          outputNodeConnections.out.get(output.ioId) ??
          (() => {
            const v: Array<[NodeId, string]> = [];
            outputNodeConnections.out.set(output.ioId, v);
            return v;
          })();
        outputNodeInputConnections.push([input.nodeId, input.ioId]);

        let inputNodeConnections = upsertNodeConnections(input.nodeId);

        inputNodeConnections.in ??= new Map();
        let inputNodeInputConnections =
          inputNodeConnections.in.get(input.ioId) ??
          (() => {
            const v: Array<[NodeId, string]> = [];
            inputNodeConnections.in.set(input.ioId, v);
            return v;
          })();
        inputNodeInputConnections.push([output.nodeId, output.ioId]);
      });

      const disconnectIO = Effect.fn(function* (
        graphId: GraphId,
        io: IORef & { type: "i" | "o" },
      ) {
        const graph = project.graphs.get(graphId);
        if (!graph) return yield* new GraphNotFoundError({ graphId });
        if (!graph.connections) return;

        const nodeConnections = graph.connections.get(io.nodeId);
        const originConnections =
          io.type === "i" ? nodeConnections?.in : nodeConnections?.out;
        if (!originConnections) return;

        const orginIOConnections = originConnections.get(io.ioId);
        if (!orginIOConnections) return;

        for (const [targetNodeId, targetIOId] of orginIOConnections) {
          const targetNodeConnections = graph.connections.get(targetNodeId);
          const targetConnections =
            io.type === "o"
              ? targetNodeConnections?.in
              : targetNodeConnections?.out;
          if (!targetConnections) continue;

          const targetIOConnections = targetConnections.get(targetIOId);
          if (!targetIOConnections) continue;

          const index = targetIOConnections.findIndex(
            ([nodeId, ioId]) => ioId === io.ioId && nodeId === io.nodeId,
          );
          if (index !== -1) targetIOConnections.splice(index, 1);
        }

        originConnections.delete(io.ioId);
      });

      const runNode = Effect.fn(function* (graphId: GraphId, nodeId: NodeId) {
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

        return yield* schema.run(io).pipe(
          Effect.map((v) => Option.fromNullable(v ?? undefined)),
          Effect.map(Option.map((output) => ({ output, node }))),
          Effect.provide(Context.make(NodeExecutionContext, { node })),
        );
      });

      const connectionForExecOutput = Effect.fn(function* (
        graphId: GraphId,
        ref: ExecOutputRef,
      ) {
        const { node } = yield* NodeExecutionContext;
        return Option.fromNullable(
          getOutputConnections(graphId, node.id, ref.id)[0],
        );
      });

      const connectionForDataInput = Effect.fn(function* (
        graphId: GraphId,
        ref: DataInputRef<any>,
      ) {
        const { node } = yield* NodeExecutionContext;
        return Option.fromNullable(
          getInputConnections(graphId, node.id, ref.id)[0],
        );
      });

      const runEventNode = Effect.fn(function* (
        graphId: GraphId,
        eventNode: Node,
        schema: Extract<NodeSchema<any, any, any>, { type: "event" }>,
        data: unknown,
      ) {
        const io = schema.io({
          out: {
            exec: (id) => new ExecOutputRef(id as IOId),
            data: (id, type) => new DataOutputRef(id, type),
          },
        });

        let ret = yield* schema.run(io, data).pipe(
          Effect.map((v) => Option.fromNullable(v ?? undefined)),
          Effect.map(Option.map((output) => ({ output, node: eventNode }))),
          Effect.provide(
            Context.make(NodeExecutionContext, { node: eventNode }),
          ),
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
        graphId: GraphId,
        nodeId: NodeId,
        data: any,
      ) {
        const eventNode = yield* getNode(graphId, nodeId);
        const schema = yield* getSchema(eventNode.schema);
        if (schema.type !== "event") return yield* new NotEventNode();

        yield* Effect.sleep("10 millis");

        const eventData = schema.event(data);
        if (Option.isNone(eventData)) return false;

        yield* Effect.gen(function* () {
          const outputData: Map<NodeId, Record<string, any>> = new Map();

          const getData = (io: IORef) =>
            Option.fromNullable(outputData.get(io.nodeId)?.[io.ioId]);

          const execCtx = Context.make(ExecutionContext, {
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
                  Effect.catchTag("NotComputationNode", () =>
                    Effect.die(
                      new Error("Cannot get input for a non-computation node"),
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
          });

          yield* runEventNode(graphId, eventNode, schema, eventData.value).pipe(
            Effect.provide(execCtx),
          );
        }).pipe(
          Effect.withSpan(`FireEventNode`, { attributes: { graphId, nodeId } }),
        );

        return true;
      });

      const addPackage = <TEvents, TState, TRpcs extends Rpc.Any>(
        name: string,
        unbuiltPkg: Package.UnbuiltPackage<TEvents, TState, TRpcs>,
      ) =>
        Effect.gen(function* () {
          const credentialLatch = yield* Effect.makeLatch(true);

          const getCredentials = credentialLatch
            .whenOpen(credentials.get())
            .pipe(Effect.map((c) => c.filter((c) => c.provider === name)));

          const builder = new PackageBuilder(name);

          unbuiltPkg.builder({
            schema: (id, schema) => builder.schema(id, schema),
          });

          let rpcServer, state;

          if (unbuiltPkg.engine) {
            const stateTrigger = yield* Mailbox.make<null>();
            const engine = unbuiltPkg.engine;

            const events = yield* Mailbox.make<{
              event: TEvents;
              // span: Tracer.Span;
            }>();

            const ret = yield* engine
              .builder({
                dirtyState: stateTrigger.offer(null),
                credentials: getCredentials.pipe(
                  Effect.catchAll(
                    (e) =>
                      new CredentialsFetchFailed({ message: e.toString() }),
                  ),
                ),
                refreshCredential: (id) =>
                  Effect.gen(function* () {
                    yield* credentialLatch.close;

                    yield* apiClient
                      .refreshCredential({
                        path: {
                          providerId: name,
                          providerUserId: id,
                        },
                      })
                      .pipe(Effect.catchAll(Effect.die));
                    yield* credentials
                      .refresh()
                      .pipe(Effect.catchAll(Effect.die));

                    return yield* new ForceRetryError();
                  }).pipe(Effect.ensuring(credentialLatch.open)),
                emitEvent: (data) => events.unsafeOffer({ event: data }),
              })
              .pipe(
                Effect.provide(
                  PackageEngine.PackageEngineContext.context({
                    packageId: name,
                  }),
                ),
              );

            if (ret.state) {
              const _state = yield* ret.state.pipe(
                Effect.andThen(SubscriptionRef.make),
              );

              yield* Mailbox.toStream(stateTrigger).pipe(
                Stream.runForEach(() =>
                  Effect.gen(function* () {
                    const v = yield* ret.state;
                    return yield* _state.pipe(SubscriptionRef.set(v));
                  }),
                ),
                Effect.forkScoped,
              );

              state = _state;
            }

            if (engine.rpcs && ret.rpc)
              rpcServer = yield* RpcServer.toHttpApp(engine.rpcs, {
                spanPrefix: `PackageRpc.${name}`,
              }).pipe(
                Effect.provide(ret.rpc),
                Effect.provide(RpcServer.layerProtocolHttp({ path: `/` })),
                Effect.provide(RpcSerialization.layerJson),
              );

            yield* Mailbox.toStream(events).pipe(
              Stream.runForEach(({ event }) =>
                Effect.gen(function* () {
                  for (const [graphId, graphEventNodes] of eventNodes) {
                    const packageEventNodes = graphEventNodes.get(name);
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
                    attributes: { package: name, event },
                  }),
                ),
              ),
              Effect.forkScoped,
            );
          }

          const pkg = builder.toPackage();

          packages.set(pkg.id, {
            pkg,
            state: Option.fromNullable(state),
            rpcServer: Option.fromNullable(rpcServer),
          });
        });

      const deleteSelection = Effect.fn(function* (
        graphId: GraphId,
        selection: Array<NodeId>,
      ) {
        const graph = project.graphs.get(graphId);
        if (!graph) return yield* new GraphNotFoundError({ graphId });

        for (const nodeId of selection) {
          const index = graph.nodes.findIndex((node) => node.id === nodeId);
          if (index === -1) continue;
          graph.nodes.splice(index, 1);
        }
      });

      return {
        createNode,
        addPackage,
        addConnection,
        disconnectIO,
        deleteSelection,
      };
    }),
    dependencies: [
      CredentialsCache.Default,
      CloudAPIClient.Default,
      ProjectPackages.Default,
    ],
  },
) {}
