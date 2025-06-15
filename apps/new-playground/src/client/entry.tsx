import { RpcClient, RpcMiddleware, RpcSerialization } from "@effect/rpc";
import { Layer, ManagedRuntime, Match, PubSub } from "effect";
import * as Effect from "effect/Effect";
import { render } from "solid-js/web";
import { ErrorBoundary, Show } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { BrowserRuntime, BrowserSocket } from "@effect/platform-browser";
import { Navigate, RouteDefinition, Router } from "@solidjs/router";
import { FetchHttpClient, Headers, Socket } from "@effect/platform";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./style.css";

import { GlobalAppState } from "../package-settings-utils";
import { ProjectEvent, RpcsSerialization } from "../shared";
import { NodeId, XY } from "../domain/Node/data";
import { GraphId } from "../domain/Graph/data";
import { SchemaRef } from "../domain/Package/data";
import { DeepWriteable } from "../types";
import { RpcRealtimeMiddleware } from "../domain/Rpc/Middleware";
import { GraphTwoWayConnections, IORef, parseIORef } from "./Graph";
import { Rpcs } from "../rpc";
import { ProjectContextProvider } from "./Project/Context";
import { PresenceClient, PresenceContextProvider } from "./Presence/Context";
import { Layout } from "./Layout";
import { RealtimeContextProvider } from "./Realtime";
import { AppRuntime, AppRuntimeProvider } from "./AppRuntime";
import {
  GetPackageRpcProtocol,
  GetPackageSettings,
  PackagesSettings,
} from "./Packages/PackagesSettings";
import { routes } from "./routes/routes";

const [packages, setPackages] = createStore<Record<string, { id: string }>>({});

const SocketLayer = BrowserSocket.layerWebSocket(`/api/realtime`);

let realtimeId: null | number;

const RpcRealtimeClient = RpcMiddleware.layerClient(
  RpcRealtimeMiddleware,
  ({ request }) =>
    Effect.succeed({
      ...request,
      headers: Headers.set(
        request.headers,
        "realtime-id",
        (realtimeId ?? -1).toString(),
      ),
    }),
);

const RpcSocketLayer = BrowserSocket.layerWebSocket(`/api/rpc`);
const RpcTransport = RpcClient.layerProtocolSocket.pipe(
  Layer.provide(RpcsSerialization),
  Layer.provide(RpcSocketLayer),
);

class Client extends Effect.Service<Client>()("Client", {
  effect: Effect.gen(function* () {
    const client = yield* RpcClient.make(Rpcs, {
      disableTracing: true,
    }).pipe(Effect.provide(RpcRealtimeClient));

    return { client };
  }),
  dependencies: [RpcTransport],
  accessors: true,
}) {}

class UI extends Effect.Service<UI>()("UI", {
  scoped: Effect.gen(function* () {
    const { client: rpcClient } = yield* Client;
    const socket = yield* Socket.Socket;

    const appRuntime = ManagedRuntime.make(
      Layer.provideMerge(
        AppRuntime.layer,
        Layer.mergeAll(
          Layer.succeed(
            GetPackageRpcProtocol,
            GetPackageRpcProtocol.of((id) =>
              RpcClient.layerProtocolHttp({
                url: `/api/package/${id}/rpc`,
              }).pipe(
                Layer.provide([
                  RpcSerialization.layerJson,
                  FetchHttpClient.layer,
                ]),
              ),
            ),
          ),
          Layer.succeed(
            GetPackageSettings,
            GetPackageSettings.of((id) =>
              rpcClient.GetPackageSettings({ package: id }),
            ),
          ),
        ),
      ),
    );

    const packagesSettings = PackagesSettings.pipe(appRuntime.runSync);

    const packageSettings = yield* Effect.promise(
      () => import("macrograph:package-settings"),
    );

    yield* Effect.all(
      Object.entries(packageSettings.default).map(([id, getPkg]) =>
        Effect.gen(function* () {
          const pkg = yield* Effect.promise(getPkg);

          yield* packagesSettings.addPackage(id, pkg);
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

    const tagType = Match.discriminator("type");

    const eventPubSub = yield* PubSub.unbounded<{ package: string }>();

    const [data, setData] = yield* rpcClient.GetProject().pipe(
      Effect.map((data) => data as DeepWriteable<typeof data>),
      Effect.map((data) => {
        return {
          ...data,
          graphs: Object.entries(data.graphs).reduce(
            (acc, [graphId, graph]) => {
              const connections: GraphTwoWayConnections = {};

              for (const [outNodeId, outNodeConnections] of Object.entries(
                graph.connections,
              )) {
                for (const [outId, outConnections] of Object.entries(
                  outNodeConnections,
                )) {
                  ((connections[NodeId.make(Number(outNodeId))] ??= {}).out ??=
                    {})[outId] = outConnections;

                  for (const [inNodeId, inId] of outConnections) {
                    (((connections[inNodeId] ??= {}).in ??= {})[inId] ??=
                      []).push([NodeId.make(Number(outNodeId)), outId]);
                  }
                }
              }

              return Object.assign(acc, {
                [graphId]: Object.assign(graph, { connections }),
              });
            },
            {} as Record<
              string,
              Omit<(typeof data.graphs)[string], "connections"> & {
                connections: GraphTwoWayConnections;
              }
            >,
          ),
        };
      }),
      Effect.map(createStore),
    );

    const storeActions = {
      disconnectIO(
        prev: typeof data,
        args: {
          graphId: GraphId;
          nodeId: NodeId;
          type: "i" | "o";
          ioId: string;
        },
      ) {
        const graph = prev.graphs[args.graphId];
        if (!graph) return;

        const ioConnections =
          graph.connections[args.nodeId]?.[args.type === "i" ? "in" : "out"];
        if (!ioConnections) return;

        const connections = ioConnections[args.ioId];
        if (!connections) return;
        delete ioConnections[args.ioId];

        for (const [oppNodeId, oppIoId] of connections) {
          const oppNodeConnections = graph.connections[oppNodeId];
          const oppConnections =
            oppNodeConnections?.[args.type === "o" ? "in" : "out"]?.[oppIoId];
          if (!oppConnections) continue;

          const index = oppConnections.findIndex(
            ([nodeId, ioId]) => nodeId === args.nodeId && ioId === args.ioId,
          );
          if (index !== -1) oppConnections.splice(index, 1);
        }
      },
      deleteNode(
        prev: typeof data,
        args: {
          graphId: GraphId;
          nodeId: NodeId;
        },
      ) {
        const graph = prev.graphs[args.graphId];
        if (!graph) return;

        const nodeConnections = graph.connections[args.nodeId];

        if (nodeConnections?.in)
          for (const ioId of Object.keys(nodeConnections.in)) {
            storeActions.disconnectIO(prev, {
              graphId: args.graphId,
              nodeId: args.nodeId,
              type: "i",
              ioId,
            });
          }

        if (nodeConnections?.out)
          for (const ioId of Object.keys(nodeConnections.out ?? {})) {
            storeActions.disconnectIO(prev, {
              graphId: args.graphId,
              nodeId: args.nodeId,
              type: "o",
              ioId,
            });
          }

        const nodeIndex = graph.nodes.findIndex(
          (node) => node.id === args.nodeId,
        );
        if (nodeIndex === -1) return;
        graph.nodes.splice(nodeIndex, 1);
      },
    };

    const [presenceClients, setPresence] = createStore<
      Record<number, PresenceClient>
    >({});

    const realtimeIdLatch = yield* Effect.makeLatch(false);
    yield* socket
      .runRaw(
        Effect.fn(function* (_data) {
          if (typeof _data === "string") {
            const data: ProjectEvent | { type: "identify"; id: number } =
              JSON.parse(_data) as any;
            if (data.type === "identify") {
              realtimeId = data.id;
              yield* realtimeIdLatch.open;
              return;
            }

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
                  setData(
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
                  setData(
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
                  setData(
                    produce((prev) => {
                      const nodes = prev.graphs[data.graphId]?.nodes;
                      if (!nodes) return;

                      nodes.push({
                        name: data.name,
                        id: data.nodeId,
                        inputs: data.inputs as DeepWriteable<
                          typeof data.inputs
                        >,
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
                  setData(
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
                      inConnections.push([
                        data.output.nodeId,
                        data.output.ioId,
                      ]);
                    }),
                  );
                }),
              ),
              tagType("IODisconnected", (data) =>
                Effect.sync(() => {
                  // tbh probably gonna need to serialize everything that got disconnected

                  setData(
                    produce((prev) => {
                      storeActions.disconnectIO(prev, {
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
                  setData(
                    produce((prev) => {
                      const graph = prev.graphs[data.graphId];
                      if (!graph) return;

                      for (const nodeId of data.selection) {
                        storeActions.deleteNode(prev, {
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
          }
        }),
      )
      .pipe(Effect.fork);

    yield* realtimeIdLatch.await;

    const actions = {
      SetNodePositions: (
        graphId: GraphId,
        positions: Array<[NodeId, (typeof XY)["Type"]]>,
        ephemeral = true,
      ) => {
        rpcClient
          .SetNodePositions({ graphId, positions })
          .pipe(Effect.runPromise);
        setData(
          produce((data) => {
            const graph = data.graphs[graphId];
            if (!graph) return;
            for (const [nodeId, position] of positions) {
              const node = graph.nodes.find((n) => n.id === nodeId);
              if (node) node.position = position;
            }
          }),
        );
      },
      CreateNode: (
        graphId: GraphId,
        schema: SchemaRef,
        position: [number, number],
      ) =>
        Effect.gen(function* () {
          const resp = yield* rpcClient.CreateNode({
            schema,
            graphId,
            position,
          });

          setData(
            produce((data) => {
              data.graphs[graphId]?.nodes.push({
                schema,
                id: resp.id,
                position: { x: position[0], y: position[1] },
                inputs: resp.io.inputs as DeepWriteable<typeof resp.io.inputs>,
                outputs: resp.io.outputs as DeepWriteable<
                  typeof resp.io.outputs
                >,
              });
            }),
          );
        }).pipe(Effect.runPromise),
      ConnectIO: (graphId: GraphId, _one: IORef, _two: IORef) =>
        Effect.gen(function* () {
          const one = parseIORef(_one);
          const two = parseIORef(_two);

          let output, input;

          if (one.type === "o" && two.type === "i") {
            output = { nodeId: one.nodeId, ioId: one.id };
            input = { nodeId: two.nodeId, ioId: two.id };
          } else if (one.type === "i" && two.type === "o") {
            output = { nodeId: two.nodeId, ioId: two.id };
            input = { nodeId: one.nodeId, ioId: one.id };
          } else return;

          yield* rpcClient.ConnectIO({ graphId, output, input });

          setData(
            produce((data) => {
              const connections = data.graphs[graphId]?.connections;
              if (!connections) return;

              const outNodeConnections = ((connections[output.nodeId] ??=
                {}).out ??= {});
              const outConnections = (outNodeConnections[output.ioId] ??= []);
              outConnections.push([input.nodeId, input.ioId]);

              const inNodeConnections = ((connections[input.nodeId] ??=
                {}).in ??= {});
              const inConnections = (inNodeConnections[input.ioId] ??= []);
              inConnections.push([output.nodeId, output.ioId]);
            }),
          );
        }).pipe(Effect.runPromise),
      DisconnectIO: (graphId: GraphId, _io: IORef) =>
        Effect.gen(function* () {
          const io = parseIORef(_io);

          yield* rpcClient.DisconnectIO({
            graphId,
            io: { nodeId: io.nodeId, ioId: io.id, type: io.type },
          });

          setData(
            produce((data) => {
              const connections = data.graphs[graphId]?.connections;
              if (!connections) return;

              const conns =
                io.type === "i"
                  ? connections[io.nodeId]?.in
                  : connections[io.nodeId]?.out;

              if (!conns) return;

              const ioConnections = conns[io.id];
              delete conns[io.id];
              if (!ioConnections) return;

              for (const ioConnection of ioConnections) {
                const [nodeId, ioId] = ioConnection;

                const oppNodeConnections =
                  io.type === "i"
                    ? connections[nodeId]?.out
                    : connections[nodeId]?.in;
                if (!oppNodeConnections) continue;

                const oppConnections = oppNodeConnections[ioId];
                if (!oppConnections) continue;

                const index = oppConnections.findIndex(
                  ([nodeId, inId]) => nodeId === io.nodeId && inId === io.id,
                );
                if (index !== -1) oppConnections.splice(index, 1);
                if (oppConnections.length < 1) delete oppNodeConnections[ioId];
              }
            }),
          );
        }).pipe(Effect.runPromise),
      DeleteSelection: (graphId: GraphId, selection: Array<NodeId>) =>
        Effect.gen(function* () {
          yield* rpcClient.DeleteSelection({ graph: graphId, selection });

          setData(
            produce((prev) => {
              for (const nodeId of selection) {
                storeActions.deleteNode(prev, { graphId, nodeId });
              }
            }),
          );
        }).pipe(Effect.runPromise),
    };

    const dispose = render(() => {
      return (
        <AppRuntimeProvider value={appRuntime}>
          <ProjectContextProvider packages={data.packages}>
            <RealtimeContextProvider
              value={{
                state: {
                  get realtimeId() {
                    return realtimeId?.toString() ?? "";
                  },
                },
              }}
            >
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
          </ProjectContextProvider>
        </AppRuntimeProvider>
      );
    }, document.getElementById("app")!);

    return yield* Effect.never;

    return { dispose };
  }),
}) {}

BrowserRuntime.runMain(
  Layer.launch(UI.Default).pipe(
    Effect.provide(Client.Default),
    Effect.provide(SocketLayer),
    Effect.scoped,
  ),
);
