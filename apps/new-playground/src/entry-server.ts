import {
  Headers,
  HttpApp,
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import {
  NodeHttpServer,
  NodeRuntime as EffectNodeRuntime,
} from "@effect/platform-node";
import { createServer } from "node:http";
import { RpcServer } from "@effect/rpc";
import {
  Context,
  Layer,
  Option,
  PubSub,
  Stream,
  Schema,
  Scope,
  FiberRef,
  Mailbox,
  Fiber,
} from "effect";
import * as Effect from "effect/Effect";
import { NodeSdk } from "@effect/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Route } from "@effect/platform/HttpRouter";
import { getCurrentFiber } from "effect/Fiber";

import { Logger } from "./Runtime";
import { SchemaNotFound } from "./errors";
import {
  Rpcs,
  RpcsSerialization,
  ProjectEvent,
  SchemaMeta,
  PackageMeta,
} from "./shared";
import utilPackage from "./util-package";
import twitchPackage from "./twitch-package";
import obsPackage from "./obs-package";
import { project } from "./project";
import { DeepWriteable } from "./types";
import { NodeRpcs, NodeRpcsLive } from "./domain/Node/rpc";
import { Graphs } from "./domain/Graph/rpc";
import {
  RealtimeConnection,
  RealtimeConnectionId,
} from "./domain/Realtime/Connection";
import { RealtimePubSub } from "./domain/Realtime/PubSub";
import { CloudAPIClient } from "./domain/CloudApi/ApiClient";
import { CloudApiAuthState } from "./domain/CloudApi/AuthState";
import { RealtimePresence } from "./domain/Realtime/Presence";
import { RpcRealtimeMiddleware } from "./domain/Rpc/Middleware";
import { ProjectActions } from "./domain/Project/Actions";
import { ProjectPackages } from "./domain/Project/Packages";
import { Graph } from "./domain/Graph/data";

const program = Effect.gen(function* () {
  const projectActions = yield* ProjectActions;
  const packages = yield* ProjectPackages;
  const realtime = yield* RealtimePubSub;

  const RpcsAll = Rpcs.merge(Rpcs, NodeRpcs);

  const RpcsLive = Rpcs.toLayer(
    Effect.gen(function* () {
      return {
        GetProject: Effect.fn(function* () {
          return {
            name: project.name,
            graphs: (() => {
              const ret: Record<string, DeepWriteable<Graph>> = {};

              for (const [key, value] of project.graphs.entries()) {
                ret[key] = {
                  ...value,
                  connections: (() => {
                    const ret: DeepWriteable<Graph["connections"]> = {};
                    if (!value.connections) return ret;

                    for (const [
                      key,
                      nodeConnections,
                    ] of value.connections.entries()) {
                      if (!nodeConnections.out) continue;
                      const outputConns = (ret[key] =
                        {} as (typeof ret)[string]);
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
        CreateNode: Effect.fn(function* (payload) {
          const node = yield* projectActions
            .createNode(payload.graphId, payload.schema, [...payload.position])
            .pipe(Effect.mapError(() => new SchemaNotFound(payload.schema)));

          yield* realtime.publish({
            type: "NodeCreated",
            graphId: payload.graphId,
            nodeId: node.id,
            position: node.position,
            schema: payload.schema,
            inputs: node.inputs,
            outputs: node.outputs,
          });

          return {
            id: node.id,
            io: { inputs: node.inputs, outputs: node.outputs },
          };
        }),
        ConnectIO: Effect.fn(function* (payload) {
          yield* projectActions.addConnection(
            payload.graphId,
            payload.output,
            payload.input,
          );

          yield* realtime.publish({
            type: "IOConnected",
            graphId: payload.graphId,
            output: payload.output,
            input: payload.input,
          });
        }),
        DisconnectIO: Effect.fn(function* (payload) {
          yield* projectActions.disconnectIO(payload.graphId, payload.io);

          yield* realtime.publish({
            type: "IODisconnected",
            graphId: payload.graphId,
            io: payload.io,
          });
        }),
        SetMousePosition: Effect.fn(function* (payload) {
          const presence = yield* RealtimePresence;
          yield* presence.setMouse(payload.graph, payload.position);
        }),
        SetSelection: Effect.fn(function* ({ value }) {
          const presence = yield* RealtimePresence;
          if (value === null) yield* presence.setSelection();
          else
            yield* presence.setSelection(
              value.graph,
              value.nodes as DeepWriteable<typeof value.nodes>,
            );
        }),
        DeleteSelection: Effect.fn(function* (payload) {
          yield* projectActions.deleteSelection(
            payload.graph,
            payload.selection as DeepWriteable<typeof payload.selection>,
          );

          yield* realtime.publish({
            type: "SelectionDeleted",
            graphId: payload.graph,
            selection: payload.selection,
          });
        }),
      };
    }),
  );

  const nextRealtimeClient = (() => {
    let i = 0;
    return () => RealtimeConnectionId.make(i++);
  })();

  const HttpAppLayer = Layer.unwrapEffect(
    Effect.gen(function* () {
      const rpcsWebApp = yield* RpcServer.toHttpAppWebsocket(RpcsAll, {
        spanPrefix: "ProjectRpc",
      }).pipe(
        Effect.provide(RpcsLive),
        Effect.provide(NodeRpcsLive),
        Effect.provide(RpcsSerialization),
        Effect.provide(
          RpcRealtimeMiddleware.context((req) =>
            Effect.succeed(
              RealtimeConnection.of({
                id: RealtimeConnectionId.make(
                  +Headers.get(req.headers, "realtime-id").pipe(
                    Option.getOrElse(() => "-1"),
                  ),
                ),
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
              Effect.provideService(RealtimeConnection, { id: connectionId }),
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

  yield* projectActions.addPackage("util", utilPackage);
  yield* projectActions.addPackage("twitch", twitchPackage);
  yield* projectActions.addPackage("obs", obsPackage);

  return yield* Layer.launch(
    HttpAppLayer.pipe(Layer.provide(HMRAwareNodeHttpServerLayer)),
  );
});

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "mg-server" },
  // Export span data to the console
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));

program.pipe(
  Effect.provide(
    Layer.mergeAll(
      Graphs.Default,
      CloudApiAuthState.Default,
      CloudAPIClient.Default,
      RealtimePresence.Default,
      ProjectActions.Default,
      ProjectPackages.Default,
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
  Effect.provide(RealtimePubSub.Default),
  Effect.provide(NodeSdkLive),
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

const createEventStream = Effect.gen(function* () {
  const realtimeClient = yield* RealtimeConnection;
  const packages = yield* ProjectPackages;

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
        type: "PresenceUpdated",
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
