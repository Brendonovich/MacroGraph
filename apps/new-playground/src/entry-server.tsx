import {
  Headers,
  HttpApp,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { RpcServer } from "@effect/rpc";
import {
  Context,
  Layer,
  Option,
  PubSub,
  Stream,
  Schema,
  FiberRef,
  Mailbox,
} from "effect";
import * as Effect from "effect/Effect";
import { NodeSdk } from "@effect/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Route } from "@effect/platform/HttpRouter";
import { getCurrentFiber } from "effect/Fiber";

import { RpcsSerialization, ProjectEvent } from "./shared";
import utilPackage from "./util-package";
import twitchPackage from "./twitch-package";
import obsPackage from "./obs-package";
import { NodeRpcsLive } from "./domain/Node/rpc";
import {
  RealtimeConnection,
  RealtimeConnectionId,
} from "./domain/Realtime/Connection";
import { RealtimePubSub } from "./domain/Realtime/PubSub";
import { CloudAPIClient } from "./domain/CloudApi/ApiClient";
import { CloudApiAuthState } from "./domain/CloudApi/AuthState";
import { Presence } from "./domain/Presence/Presence";
import { RpcRealtimeMiddleware } from "./domain/Rpc/Middleware";
import { ProjectActions } from "./domain/Project/Actions";
import { ProjectPackages } from "./domain/Project/Packages";
import { Graphs } from "./domain/Graph/Graphs";
import { GraphRpcsLive } from "./domain/Graph/rpc";
import { ProjectRpcsLive } from "./domain/Project/rpc";
import { Rpcs } from "./rpc";
import { PresenceRpcsLive } from "./domain/Presence/rpc";
import { renderToStream } from "solid-js/web";
import { Test } from "./ssr-test";

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "mg-server" },
  // Export span data to the console
  spanProcessor: [new BatchSpanProcessor(new OTLPTraceExporter())],
}));

export const DepsLive = Layer.provideMerge(
  ProjectActions.Default,
  Layer.mergeAll(
    Graphs.Default,
    CloudApiAuthState.Default,
    CloudAPIClient.Default,
    Presence.Default,
    ProjectPackages.Default,
    RealtimePubSub.Default,
    NodeSdkLive,
  ),
);

const RpcsLive = Layer.mergeAll(
  ProjectRpcsLive,
  GraphRpcsLive,
  NodeRpcsLive,
  PresenceRpcsLive,
);

export const ServerLive = Effect.gen(function* () {
  const projectActions = yield* ProjectActions;
  const packages = yield* ProjectPackages;

  const nextRealtimeClient = (() => {
    let i = 0;
    return () => RealtimeConnectionId.make(i++);
  })();

  yield* projectActions.addPackage("util", utilPackage).pipe(Effect.orDie);
  yield* projectActions.addPackage("twitch", twitchPackage).pipe(Effect.orDie);
  yield* projectActions.addPackage("obs", obsPackage).pipe(Effect.orDie);

  const rpcsWebApp = yield* RpcServer.toHttpAppWebsocket(Rpcs, {
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
          yield* writer(JSON.stringify({ type: "identify", id: connectionId }));

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
        const server = packages.get(pkg)?.rpcServer.pipe(Option.getOrUndefined);
        if (!server)
          return HttpServerResponse.text("Package not found", {
            status: 404,
          });

        return yield* server;
      }),
    ),
  );
});

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

  const presence = yield* Presence;
  yield* presence.registerToScope;

  const numSubscriptionsStream = presence.changes.pipe(
    Stream.map((v): ProjectEvent => {
      return {
        type: "PresenceUpdated",
        data: v,
      };
    }),
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
