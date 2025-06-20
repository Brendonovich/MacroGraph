import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Layer, ManagedRuntime, Match, PubSub, Stream } from "effect";
import * as Effect from "effect/Effect";
import { ErrorBoundary, render } from "solid-js/web";
import { createStore, produce, reconcile } from "solid-js/store";
import { BrowserRuntime, BrowserSocket } from "@effect/platform-browser";
import { Router } from "@solidjs/router";
import { FetchHttpClient } from "@effect/platform";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./style.css";

import { GlobalAppState } from "../package-settings-utils";
import { PresenceClient, PresenceContextProvider } from "./Presence/Context";
import { Layout } from "./Layout";
import { RealtimeContextProvider } from "./Realtime";
import { ProjectRuntime, ProjectRuntimeProvider } from "./AppRuntime";
import {
  GetPackageRpcProtocol,
  PackagesSettings,
} from "./Packages/PackagesSettings";
import { routes } from "./routes/Routes";
import { ProjectRpc } from "./Project/Rpc";
import { ProjectState } from "./Project/State";
import { ProjectRealtime } from "./Project/Realtime";

const [packages, setPackages] = createStore<Record<string, { id: string }>>({});

const ProjectRuntimeLive = Layer.provideMerge(
  ProjectRuntime.layer,
  Layer.mergeAll(
    Layer.succeed(
      GetPackageRpcProtocol,
      GetPackageRpcProtocol.of((id) =>
        RpcClient.layerProtocolHttp({
          url: `/api/package/${id}/rpc`,
        }).pipe(
          Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
        ),
      ),
    ),
    ProjectRpc.Default.pipe(
      Layer.provide(Layer.scope),
      Layer.provide(BrowserSocket.layerWebSocket(`/api/rpc`)),
    ),
    BrowserSocket.layerWebSocketConstructor,
  ),
);

const runtime = ManagedRuntime.make(ProjectRuntimeLive);

class UI extends Effect.Service<UI>()("UI", {
  scoped: Effect.gen(function* () {
    const packageSettings = yield* Effect.promise(
      () => import("macrograph:package-settings"),
    );

    yield* Effect.all(
      Object.entries(packageSettings.default).map(([id, getPkg]) =>
        Effect.gen(function* () {
          const pkg = yield* Effect.promise(getPkg);

          yield* PackagesSettings.addPackage(id, pkg);
        }),
      ),
      { concurrency: 3 },
    );

    const [globalState, setGlobalState] = createStore<GlobalAppState>({
      auth: {
        state: "logged-out",
        login: Effect.gen(function* () {
          console.log("LOGIN");
        }),
      },
      logsPanelOpen: false,
    });

    const eventPubSub = yield* PubSub.unbounded<{ package: string }>();

    const [presenceClients, setPresence] = createStore<
      Record<number, PresenceClient>
    >({});

    const realtime = yield* ProjectRealtime.make();
    const tagType = Match.discriminator("type");
    yield* realtime.stream.pipe(
      Stream.runForEach(
        Effect.fn(function* (data) {
          if (data.type === "identify")
            throw new Error("Duplicate identify event");

          const { setState, actions } = yield* ProjectState;

          yield* Match.value(data).pipe(
            tagType("authChanged", ({ data }) =>
              Effect.sync(() => {
                setGlobalState(
                  "auth",
                  data
                    ? { state: "logged-in", userId: data.id }
                    : {
                        state: "logged-out",
                        login: Effect.gen(function* () {
                          console.log("LOGIN");
                        }),
                      },
                );
              }),
            ),
            tagType("packageStateChanged", (data) => {
              return eventPubSub.offer({ package: data.package });
            }),
            tagType("connectedClientsChanged", ({ data }) =>
              Effect.sync(() => {} /*setConnectedClients(data)*/),
            ),
            tagType("packageAdded", ({ data }) =>
              Effect.sync(() => {
                if (packages[data.package]) return;
                setPackages(data.package, { id: data.package });
              }),
            ),
            tagType("NodeMoved", (data) =>
              Effect.sync(() => {
                setState(
                  produce((prev) => {
                    const node = prev.graphs[data.graphId]?.nodes.find(
                      (n) => n.id === data.nodeId,
                    );

                    if (node) node.position = data.position;
                  }),
                );
              }),
            ),
            tagType("NodesMoved", (data) =>
              Effect.sync(() => {
                setState(
                  produce((prev) => {
                    const graph = prev.graphs[data.graphId];
                    if (!graph) return;

                    for (const [nodeId, position] of data.positions) {
                      const node = graph.nodes.find((n) => n.id === nodeId);
                      if (node) node.position = position;
                    }
                  }),
                );
              }),
            ),
            tagType("NodeCreated", (data) =>
              Effect.sync(() => {
                setState(
                  produce((prev) => {
                    const nodes = prev.graphs[data.graphId]?.nodes;
                    if (!nodes) return;

                    nodes.push({
                      name: data.name,
                      id: data.nodeId,
                      inputs: data.inputs as DeepWriteable<typeof data.inputs>,
                      outputs: data.outputs as DeepWriteable<
                        typeof data.outputs
                      >,
                      position: data.position,
                      schema: data.schema,
                    });
                  }),
                );
              }),
            ),
            tagType("IOConnected", (data) =>
              Effect.sync(() => {
                setState(
                  produce((prev) => {
                    const graph = prev.graphs[data.graphId];
                    if (!graph) return;

                    const outNodeConnections = (graph.connections[
                      data.output.nodeId
                    ] ??= {});
                    const outConnections = ((outNodeConnections.out ??= {})[
                      data.output.ioId
                    ] ??= []);
                    outConnections.push([data.input.nodeId, data.input.ioId]);

                    const inNodeConnections = (graph.connections[
                      data.input.nodeId
                    ] ??= {});
                    const inConnections = ((inNodeConnections.in ??= {})[
                      data.input.ioId
                    ] ??= []);
                    inConnections.push([data.output.nodeId, data.output.ioId]);
                  }),
                );
              }),
            ),
            tagType("IODisconnected", (data) =>
              Effect.sync(() => {
                // tbh probably gonna need to serialize everything that got disconnected

                setState(
                  produce((prev) => {
                    actions.disconnectIO(prev, {
                      graphId: data.graphId,
                      nodeId: data.io.nodeId,
                      ioId: data.io.ioId,
                      type: data.io.type,
                    });
                  }),
                );
              }),
            ),
            tagType("PresenceUpdated", (data) =>
              Effect.sync(() => {
                setPresence(
                  reconcile(data.data as DeepWriteable<typeof data.data>),
                );
              }),
            ),
            tagType("SelectionDeleted", (data) =>
              Effect.sync(() => {
                setState(
                  produce((prev) => {
                    const graph = prev.graphs[data.graphId];
                    if (!graph) return;

                    for (const nodeId of data.selection) {
                      actions.deleteNode(prev, {
                        graphId: data.graphId,
                        nodeId,
                      });
                    }
                  }),
                );
              }),
            ),
            Match.exhaustive,
          );
        }),
      ),
      Effect.fork,
    );

    const dispose = render(() => {
      return (
        <ProjectRuntimeProvider value={runtime}>
          <RealtimeContextProvider value={{ id: () => realtime.id }}>
            <PresenceContextProvider value={{ clients: presenceClients }}>
              <ErrorBoundary
                fallback={(e) => (
                  <div>
                    {e.toString()}
                    <pre>{e.stack}</pre>
                  </div>
                )}
              >
                <Router root={Layout}>{routes}</Router>
              </ErrorBoundary>
            </PresenceContextProvider>
          </RealtimeContextProvider>
        </ProjectRuntimeProvider>
      );
    }, document.getElementById("app")!);

    return yield* Effect.never;

    return { dispose };
  }),
}) {}

runtime.runFork(
  Layer.launch(UI.Default).pipe(
    // Effect.provide(ProjectRuntimeLive),
    Effect.scoped,
  ),
);
