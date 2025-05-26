import {
  HttpApp,
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  Socket,
} from "@effect/platform";
import {
  NodeHttpServer,
  NodeRuntime as EffectNodeRuntime,
} from "@effect/platform-node";
import { createServer } from "node:http";
import {
  RpcGroup,
  RpcMiddleware,
  RpcSerialization,
  RpcServer,
} from "@effect/rpc";
import {
  Context,
  Layer,
  Option,
  pipe,
  PubSub,
  Stream,
  SubscriptionRef,
  Cache,
  Schema,
  Scope,
  Console,
  FiberRef,
  Mailbox,
  Fiber,
} from "effect";
import * as Effect from "effect/Effect";

import type { NodeSchema } from "./schema";
import { Node } from "./node";
import {
  CredentialsFetchFailed,
  EventRef,
  ForceRetryError,
  Package,
  PackageBuilder,
  PackageBuildReturn,
  PackageDefinition,
  PackageEngine,
} from "./package";
import {
  ExecutionContext,
  Logger,
  NodeExecutionContext,
  NodeRuntime,
} from "./runtime";
import {
  DataInputRef,
  DataOutputRef,
  ExecInputRef,
  ExecOutputRef,
  IOId,
} from "./io";
import {
  NodeNotFound,
  NotComputationNode,
  NotEventNode,
  SchemaNotFound,
} from "./errors";
import { Rpcs, RpcsSerialization, ProjectEvent } from "./shared";
import utilPackage from "./util-package";
import twitchPackage from "./twitch-package";
import obsPackage from "./obs-package";
import { Route } from "@effect/platform/HttpRouter";
import { getCurrentFiber } from "effect/Fiber";
import { NodeRpcs, NodeRpcsLive } from "./domain/Node/rpc";
import { Graphs } from "./domain/Graph/rpc";
import { NodeId } from "./domain/Node/data";
import { project } from "./project";
import {
  RealtimeConnection,
  RealtimeConnectionId,
} from "./domain/Realtime/Connection";
import { RealtimePubSub } from "./domain/Realtime/PubSub";
import { CloudAPIClient } from "./domain/CloudApi/ApiClient";
import { CloudApiAuthState } from "./domain/CloudApi/AuthState";
import { RealtimePresence } from "./domain/Realtime/Presence";
import { Middleware } from "./domain/Rpc/Middleware";

type OutputDataMap = Map<NodeId, Record<string, any>>;

type PackageEntry = {
  pkg: Package;
  state: Option.Option<SubscriptionRef.SubscriptionRef<any>>;
  rpcServer: Option.Option<HttpApp.Default<never, Scope.Scope>>;
  ret: PackageBuildReturn<any, any>;
};
const packages = new Map<string, PackageEntry>();

Effect.gen(function* () {
  const apiClient = yield* CloudAPIClient;

  const credentials = yield* Cache.make({
    capacity: 1,
    timeToLive: "1 minute",
    lookup: (_: void) => apiClient.getCredentials(),
  });

  let nodeCounter = 69 as NodeId;

  const nodes = new Map<number, Node>();

  const getNode = (id: NodeId) => Option.fromNullable(nodes.get(id));

  const getPackage = (pkgId: string) =>
    Option.fromNullable(packages.get(pkgId));

  const eventNodes = new Map<EventRef, Set<NodeId>>();

  const getEventNodesForEvent = (event: EventRef) =>
    Option.fromNullable(eventNodes.get(event));

  type SchemaRef = {
    pkgId: string;
    schemaId: string;
  };

  const getSchema = (schemaRef: SchemaRef) =>
    Option.fromNullable(
      packages.get(schemaRef.pkgId)?.pkg.schemas.get(schemaRef.schemaId),
    );

  const createNode = (schemaRef: SchemaRef) =>
    Effect.gen(function* () {
      const schema = yield* getSchema(schemaRef);
      const id = nodeCounter++ as NodeId;
      const node = { id, schema: schemaRef, io: schema.io } satisfies Node;
      nodes.set(id, node);

      if (schema.type === "event") {
        let nodes = eventNodes.get(schema.event);
        if (!nodes) {
          nodes = new Set();
          eventNodes.set(schema.event, nodes);
        }

        nodes.add(id);
      }

      return node;
    });

  type IORef = { nodeId: NodeId; ioId: IOId };

  type NodeConnections = {
    in?: Map<IOId, Array<IORef>>;
    out?: Map<IOId, Array<IORef>>;
  };
  const connections = new Map<NodeId, NodeConnections>();

  const upsertNodeConnections = (nodeId: NodeId) =>
    connections.get(nodeId) ??
    (() => {
      const v: NodeConnections = {};
      connections.set(nodeId, v);
      return v;
    })();

  const getInputConnections = (nodeId: NodeId, inputId: IOId) =>
    Option.fromNullable(connections.get(nodeId)?.in?.get(inputId)).pipe(
      Option.getOrElse<Array<IORef>>(() => []),
    );

  const getOutputConnections = (nodeId: NodeId, outputId: IOId) =>
    Option.fromNullable(connections.get(nodeId)?.out?.get(outputId)).pipe(
      Option.getOrElse<Array<IORef>>(() => []),
    );

  const addConnection = Effect.fn(function* (output: IORef, input: IORef) {
    if (Option.isNone(getNode(output.nodeId)))
      return yield* new NodeNotFound(output);

    let outputNodeConnections = upsertNodeConnections(output.nodeId);

    outputNodeConnections.out ??= new Map();
    let outputNodeInputConnections =
      outputNodeConnections.out.get(output.ioId) ??
      (() => {
        const v: Array<IORef> = [];
        outputNodeConnections.out.set(output.ioId, v);
        return v;
      })();
    outputNodeInputConnections.push(input);

    if (Option.isNone(getNode(input.nodeId)))
      return yield* new NodeNotFound(input);

    let inputNodeConnections = upsertNodeConnections(input.nodeId);

    inputNodeConnections.in ??= new Map();
    let inputNodeInputConnections =
      inputNodeConnections.in.get(input.ioId) ??
      (() => {
        const v: Array<IORef> = [];
        inputNodeConnections.in.set(input.ioId, v);
        return v;
      })();
    inputNodeInputConnections.push(output);
  });

  const runNode = Effect.fn(function* (nodeId: NodeId) {
    const node = yield* getNode(nodeId);
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

  const connectionForExecOutput = Effect.fn(function* (ref: ExecOutputRef) {
    const { node } = yield* NodeExecutionContext;
    return Option.fromNullable(getOutputConnections(node.id, ref.id)[0]);
  });

  const connectionForDataInput = Effect.fn(function* (ref: DataInputRef<any>) {
    const { node } = yield* NodeExecutionContext;
    return Option.fromNullable(getInputConnections(node.id, ref.id)[0]);
  });

  const runEventNode = Effect.fn(function* (
    eventNode: Node,
    schema: Extract<NodeSchema, { type: "event" }>,
    data: any,
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
      Effect.provide(Context.make(NodeExecutionContext, { node: eventNode })),
    );

    while (Option.isSome(ret)) {
      const { output, node } = ret.value;

      ret = yield* pipe(
        yield* connectionForExecOutput(output).pipe(
          Effect.provide(Context.make(NodeExecutionContext, { node })),
        ),
        Option.andThen((ref) => runNode(ref.nodeId)),
        Effect.transposeOption,
        Effect.map(Option.flatten),
      );
    }
  });

  const executeEventNode = Effect.fn(function* (nodeId: NodeId, data: any) {
    const eventNode = yield* getNode(nodeId);
    const schema = yield* getSchema(eventNode.schema);
    if (schema.type !== "event") return yield* new NotEventNode();

    const outputData: OutputDataMap = new Map();

    const getData = (io: IORef) =>
      Option.fromNullable(outputData.get(io.nodeId)?.[io.ioId]);

    const execCtx = Context.make(ExecutionContext, {
      traceId: Math.random().toString(),
      getInput: (input) =>
        Effect.gen(function* () {
          const connection = yield* connectionForDataInput(input);
          if (Option.isNone(connection)) return "Value";

          const data = getData(connection.value);
          if (Option.isSome(data)) return data.value;

          yield* runNode(connection.value.nodeId).pipe(
            Effect.catchTag("NotComputationNode", () =>
              Effect.die(
                new Error("Cannot get input for a non-computation node"),
              ),
            ),
          );

          return getData(connection.value).pipe(Option.getOrThrow);
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

    yield* runEventNode(eventNode, schema, data).pipe(Effect.provide(execCtx));
  });

  const logger = yield* Logger;

  const nodeRuntime = Context.make(NodeRuntime, {
    emitEvent: (pkgId, eventId, data) =>
      Effect.gen(function* () {
        const { pkg } = yield* getPackage(pkgId);
        const event = yield* pkg.getEvent(eventId);
        const nodeIds = getEventNodesForEvent(event);

        if (Option.isNone(nodeIds)) return;

        for (const nodeId of nodeIds.value) {
          executeEventNode(nodeId, data).pipe(
            Effect.provide(Context.make(Logger, logger)),
            Effect.runFork,
          );
        }
      }),
  });

  const addPackage = Effect.fn(function* (
    name: string,
    def: PackageDefinition<any, any>,
  ) {
    const dirtyState = Effect.gen(function* () {
      if (Option.isNone(ret)) return;
      const state = packages.get(name)?.state;
      if (!state || Option.isNone(state)) return;

      ret.value.state.get.pipe(
        Effect.andThen((v) => state.value.pipe(SubscriptionRef.set(v))),
        Effect.runFork,
      );
    });

    const credentialLatch = yield* Effect.makeLatch(true);

    const getCredentials = credentialLatch.whenOpen(credentials.get());

    const builder = new PackageBuilder(name);
    const ret = Option.fromNullable(
      (yield* def(builder, {
        dirtyState,
        credentials: getCredentials.pipe(
          Effect.catchAll(
            (e) => new CredentialsFetchFailed({ message: e.toString() }),
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
            yield* credentials.refresh().pipe(Effect.catchAll(Effect.die));

            return yield* new ForceRetryError();
          }).pipe(Effect.ensuring(credentialLatch.open)),
      })) ?? null,
    );

    const pkg = builder.toPackage(Option.getOrUndefined(ret));

    pkg.engine?.pipe(
      Effect.provide(nodeRuntime),
      Effect.provide(
        PackageEngine.PackageEngineContext.context({ packageId: pkg.id }),
      ),
      Effect.runFork,
    );

    const state = yield* ret.pipe(
      Effect.andThen((ret) => ret.state.get),
      Effect.andThen(SubscriptionRef.make),
      Effect.option,
    );

    const rpcServer = yield* ret.pipe(
      Effect.andThen((ret) =>
        RpcServer.toHttpApp(
          ret.rpc.group as unknown as RpcGroup.RpcGroup<never>,
        ).pipe(
          Effect.provide(ret.rpc.layer),
          Effect.provide(RpcServer.layerProtocolHttp({ path: `/` })),
          Effect.provide(RpcSerialization.layerJson),
        ),
      ),
      Effect.option,
    );

    packages.set(pkg.id, {
      pkg,
      state,
      rpcServer,
      ret: Option.getOrUndefined(ret)!,
    });
  });

  const RpcsAll = Rpcs.merge(Rpcs, NodeRpcs);

  const RpcsLive = Rpcs.toLayer(
    Effect.gen(function* () {
      return {
        // CreateNode: Effect.fn(function* (payload) {
        //   const node = yield* createNode(payload.schema).pipe(
        //     Effect.mapError(() => new SchemaNotFound(payload.schema)),
        //   );

        //   const io = {
        //     inputs: [] as { id: string; variant: "exec" | "data" }[],
        //     outputs: [] as { id: string; variant: "exec" | "data" }[],
        //   };

        //   node.io({
        //     out: {
        //       exec: (id) => {
        //         io.outputs.push({ id, variant: "exec" });
        //         return new ExecOutputRef(id as IOId);
        //       },
        //       data: (id, type) => {
        //         io.outputs.push({ id, variant: "data" });
        //         return new DataOutputRef(id, type);
        //       },
        //     },
        //     in: {
        //       exec: (id) => {
        //         io.inputs.push({ id, variant: "exec" });
        //         return new ExecInputRef(id);
        //       },
        //       data: (id, type) => {
        //         io.inputs.push({ id, variant: "data" });
        //         return new DataInputRef(id as IOId, type);
        //       },
        //     },
        //   });

        //   return { id: node.id, io };
        // }),
        // ConnectIO: Effect.fn(function* (payload) {
        //   yield* addConnection(payload.output as any, payload.input as any);
        // }),
        // Events: () =>
        GetProject: Effect.fn(function* () {
          return project;
        }),
        GetPackageSettings: Effect.fn(function* (payload) {
          const pkg = packages.get(payload.package)!;
          return yield* Option.getOrNull(pkg.state)!.get;
        }),
      };
    }),
  );

  const realtimeClient = new Set<number>();
  const nextRealtimeClient = (() => {
    let i = 0;
    return () => RealtimeConnectionId.make(i++);
  })();

  const HttpAppLayer = Layer.unwrapEffect(
    Effect.gen(function* () {
      const rpcsWebApp = yield* RpcServer.toHttpApp(RpcsAll).pipe(
        Effect.provide(RpcsLive),
        Effect.provide(NodeRpcsLive),
        Effect.provide(RpcsSerialization),
        Effect.provideService(
          Middleware,
          Middleware.of((req) =>
            Effect.succeed(
              RealtimeConnection.of({
                id: RealtimeConnectionId.make(+req.headers["x-mg-realtime-id"]),
              }),
            ),
          ),
        ),
      );

      return HttpRouter.empty.pipe(
        HttpRouter.mountApp("/rpc", rpcsWebApp),
        HttpRouter.get(
          "/realtime",
          Effect.gen(function* () {
            const req = yield* HttpServerRequest.HttpServerRequest;
            const socket = yield* req.upgrade;
            const writer = yield* socket.writer;

            const connectionId = nextRealtimeClient();

            yield* Effect.gen(function* () {
              yield* writer(
                JSON.stringify({ type: "identify", id: connectionId }),
              );

              const mailbox = yield* createEventStream;
              while (true) {
                const a = yield* mailbox.take;
                yield* writer(JSON.stringify(a));
              }
            }).pipe(
              Effect.provideService(RealtimeConnection, {
                id: connectionId,
              }),
              Effect.forkScoped,
            );

            yield* socket.runRaw((data) => {});

            return HttpServerResponse.empty();
          }).pipe(Effect.scoped),
        ),
        allAsMounted(
          "/package/:package/rpc",
          Effect.gen(function* () {
            const { package: pkg } = yield* HttpRouter.schemaPathParams(
              Schema.Struct({ package: Schema.String }),
            );
            const server = packages
              .get(pkg)
              ?.rpcServer.pipe(Option.getOrUndefined);
            if (!server)
              return HttpServerResponse.text("Package not found", {
                status: 404,
              });

            return yield* server;
          }),
        ),
        HttpServer.serve(HttpMiddleware.cors()),
        HttpServer.withLogAddress,
      );
    }),
  );

  // wait for previous to close
  yield* Effect.sleep("10 millis");

  yield* addPackage("util", utilPackage);
  yield* addPackage("twitch", twitchPackage);
  yield* addPackage("obs", obsPackage);

  return yield* Layer.launch(
    HttpAppLayer.pipe(Layer.provide(HMRAwareNodeHttpServerLayer)),
  );
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      Graphs.Default,
      RealtimePubSub.Default,
      CloudApiAuthState.Default,
      CloudAPIClient.Default,
      RealtimePresence.Default,
    ),
  ),
  Effect.scoped,
  Effect.provide(
    Context.make(Logger, {
      print: (v: string) => {
        console.log(v);
        return Effect.succeed(null);
      },
    }),
  ),
  EffectNodeRuntime.runMain,
);

const HMRAwareNodeHttpServerLayer = NodeHttpServer.layer(
  () => {
    const server = createServer();

    const fiber = Option.getOrThrow(Fiber.getCurrentFiber());

    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        Fiber.interrupt(fiber).pipe(Effect.runPromise);
        server.closeAllConnections();
        server.close();
      });
    }

    return server;
  },
  { port: 5678, host: "0.0.0.0" },
);

const executeAppAsMounted = <A, E, R>(app: HttpApp.HttpApp<A, E, R>) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest;
    const fiber = Option.getOrThrow(getCurrentFiber());
    const context = Context.unsafeMake(
      new Map(fiber.getFiberRef(FiberRef.currentContext).unsafeMap),
    );

    context.unsafeMap.set(
      HttpServerRequest.HttpServerRequest.key,
      sliceRequestUrl(req, req.url),
    );

    return yield* app;
  });

function sliceRequestUrl(
  request: HttpServerRequest.HttpServerRequest,
  prefix: string,
) {
  const prefexLen = prefix.length;
  return request.modify({
    url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen),
  });
}

const allAsMounted =
  <R1, E1>(path: `/${string}`, handler: Route.Handler<E1, R1>) =>
  <E, R>(self: HttpRouter.HttpRouter<E, R>) =>
    HttpRouter.all(self, path, executeAppAsMounted(handler));

const createEventStream: Effect.Effect<
  Mailbox.Mailbox<any, never>,
  never,
  | Scope.Scope
  | RealtimeConnection
  | RealtimePubSub
  | CloudApiAuthState
  | RealtimePresence
> = Effect.gen(function* () {
  const realtimeClient = yield* RealtimeConnection;

  const packageStates = Stream.fromIterable(packages.entries()).pipe(
    Stream.filterMapEffect(([name, { state }]) =>
      Option.map(state, (state) =>
        state.get.pipe(
          Effect.map((value): (typeof ProjectEvent)["Type"] => ({
            type: "packageAdded",
            data: { package: name },
          })),
        ),
      ),
    ),
  );

  const cloudAuth = yield* CloudApiAuthState;

  const authStream = Stream.concat(
    Stream.fromEffect(cloudAuth.get),
    cloudAuth.changes,
  ).pipe(
    Stream.map((data): (typeof ProjectEvent)["Type"] => ({
      type: "authChanged",
      data: data ? { id: data.id } : null,
    })),
  );

  const eventQueue = yield* PubSub.unbounded<(typeof ProjectEvent)["Type"]>();

  const eventStream = Stream.fromPubSub(eventQueue);

  const packageStatesStream = Stream.fromIterable(packages.entries()).pipe(
    Stream.filterMap(([name, { state }]) =>
      Option.map(state, (state) => [name, state] as const),
    ),
    Stream.flatMap(
      ([name, state]) =>
        state.changes.pipe(
          Stream.map((): (typeof ProjectEvent)["Type"] => ({
            type: "packageStateChanged",
            package: name,
          })),
        ),
      { concurrency: "unbounded" },
    ),
  );

  const presence = yield* RealtimePresence;
  yield* presence.registerToScope;

  const numSubscriptionsStream = presence.changes.pipe(
    Stream.map(
      (v): ProjectEvent => ({
        type: "connectedClientsChanged",
        data: v,
      }),
    ),
  );

  const mailbox = yield* Mailbox.make<ProjectEvent>();

  const realtime = yield* RealtimePubSub;

  const realtimeStream = realtime.subscribe().pipe(
    Stream.filterMap(([id, item]) => {
      if (id !== realtimeClient.id) return Option.some(item);
      return Option.none();
    }),
  );

  yield* Stream.mergeAll(
    [
      packageStates,
      authStream,
      eventStream,
      packageStatesStream,
      numSubscriptionsStream,
      realtimeStream,
    ],
    { concurrency: "unbounded" },
  ).pipe(
    Stream.runForEach((i) => mailbox.offer(i)),
    Effect.forkScoped,
  );

  return mailbox;
});
