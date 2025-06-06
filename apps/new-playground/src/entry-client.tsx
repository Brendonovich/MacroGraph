// @refresh reload
import { RpcClient, RpcMiddleware, RpcSerialization } from "@effect/rpc";
import { Layer, Match, PubSub, Stream } from "effect";
import * as Effect from "effect/Effect";
import { render } from "solid-js/web";
import {
  createMemo,
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { BrowserRuntime, BrowserSocket } from "@effect/platform-browser";
import { A, Navigate, RouteDefinition, Router } from "@solidjs/router";
import { FetchHttpClient, Headers, Socket } from "@effect/platform";
import { createDeepSignal } from "@solid-primitives/resource";
import { cx } from "cva";
import { Popover } from "@kobalte/core/popover";
import createPresence from "solid-presence";
import { createEventListener } from "@solid-primitives/event-listener";
import { createElementBounds } from "@solid-primitives/bounds";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./style.css";

import { GlobalAppState } from "./package-settings-utils";
import { ProjectEvent, Rpcs, RpcsSerialization } from "./shared";
import { NodeRpcs } from "./domain/Node/rpc";
import { NodeId, XY } from "./domain/Node/data";
import { GraphId } from "./domain/Graph/data";
import { SchemaRef } from "./domain/Package/data";
import { DeepWriteable } from "./types";
import { RpcRealtimeMiddleware } from "./domain/Rpc/Middleware";
import {
  Graph,
  GraphTwoWayConnections,
  IORef,
  parseIORef,
} from "./components/Graph";
import { ComponentProps } from "solid-js";
import { createMousePosition } from "@solid-primitives/mouse";
import { createEffect } from "solid-js";

// const API_HOST = "192.168.20.22:5678";
const API_HOST = "countries-cosmetics-valuable-selecting.trycloudflare.com";
const SECURE_PREIX = window.location.href.startsWith("https") ? "s" : "";

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
    const client = yield* RpcClient.make(Rpcs.merge(NodeRpcs), {
      disableTracing: true,
    }).pipe(Effect.provide(RpcRealtimeClient));

    // let i = 0;

    return {
      client,
      // client: new Proxy(client, {
      //   get:
      //     (target, key: string) =>
      //     (...args: any[]) => {
      //       const id = i++;
      //       return Effect.gen(function* () {
      //         const res = yield* (target as any)[key](...args);
      //         console.log({ res });
      //         return res;
      //       }).pipe(Effect.ensuring(Effect.sync(() => {})));
      //     },
      // }),
    };
  }),
  dependencies: [RpcTransport],
  accessors: true,
}) {}

class UI extends Effect.Service<UI>()("UI", {
  scoped: Effect.gen(function* () {
    const { client: rpcClient } = yield* Client;
    const socket = yield* Socket.Socket;

    const packageSettings = yield* Effect.promise(
      () => import("macrograph:package-settings"),
    );

    const packageModules = new Map(
      yield* Effect.all(
        Object.entries(packageSettings.default).map(([name, _pkg]) =>
          Effect.gen(function* () {
            const pkg = yield* Effect.promise(_pkg);
            const client = yield* RpcClient.make(pkg.Rpcs, {
              disableTracing: true,
            }).pipe(
              Effect.provide(
                RpcClient.layerProtocolHttp({
                  url: `/api/package/${name}/rpc`,
                }),
              ),
              Effect.provide(RpcSerialization.layerJson),
              Effect.provide(FetchHttpClient.layer),
            );
            return [
              name,
              { Settings: pkg.default, rpcClient: client },
            ] as const;
          }),
        ),
      ),
    );

    function getPackage(name: string) {
      return packageModules.get(name)!;
    }

    const [globalState, setGlobalState] = createStore<GlobalAppState>({
      auth: {
        state: "logged-out",
        login: Effect.gen(function* () {
          console.log("LOGIN");
        }),
      },
    });

    const [connectedClients, setConnectedClients] = createSignal(0);

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

    const [presence, setPresence] = createStore<
      Record<
        number,
        {
          name: string;
          colour: string;
          mouse?: { graph: GraphId; x: number; y: number };
          selection?: { graph: GraphId; nodes: NodeId[] };
        }
      >
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
                Effect.sync(() => setConnectedClients(data)),
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
      const routes: RouteDefinition[] = [
        {
          path: "/",
          component: () => {
            const graph = () => data.graphs["0"];

            const [selection, setSelection] = createStore<
              { graphId: GraphId; items: Set<NodeId> } | { graphId: null }
            >({ graphId: null });

            const [ref, setRef] = createSignal<HTMLElement | null>(null);

            const bounds = createElementBounds(ref);
            const mouse = createMousePosition();

            const [schemaMenu, setSchemaMenu] = createSignal<
              | { open: false }
              | { open: true; position: { x: number; y: number } }
            >({ open: false });

            createEventListener(window, "keydown", (e) => {
              if (e.code === "Backspace" || e.code === "Delete") {
                if (selection.graphId !== null) {
                  actions.DeleteSelection(selection.graphId, [
                    ...selection.items,
                  ]);
                }
              } else if (e.code === "Period") {
                if (e.metaKey || e.ctrlKey) {
                  setSchemaMenu({
                    open: true,
                    position: {
                      x: mouse.x - (bounds.left ?? 0),
                      y: mouse.y - (bounds.top ?? 0),
                    },
                  });
                }
              }
            });

            createEffect(() => {
              rpcClient
                .SetSelection({
                  value:
                    selection.graphId === null
                      ? null
                      : {
                          graph: selection.graphId,
                          nodes: [...selection.items],
                        },
                })
                .pipe(Effect.runPromise);
            });

            return (
              <div class="flex flex-row flex-1 overflow-hidden">
                <Show when={graph()} keyed>
                  {(graph) => {
                    createEventListener(window, "pointermove", (e) => {
                      rpcClient
                        .SetMousePosition({
                          graph: graph.id,
                          position: {
                            x: e.clientX - (bounds.left ?? 0),
                            y: e.clientY - (bounds.top ?? 0),
                          },
                        })
                        .pipe(Effect.runPromise);
                    });

                    const [schemaMenuRef, setSchemaMenuRef] =
                      createSignal<HTMLElement | null>(null);

                    const schemaMenuPresence = createPresence({
                      show: () => schemaMenu().open,
                      element: schemaMenuRef,
                    });

                    const schemaMenuPosition = createMemo(
                      (prev: { x: number; y: number } | undefined) => {
                        const m = schemaMenu();
                        if (m.open) return m.position;
                        return prev;
                      },
                    );

                    return (
                      <>
                        <Graph
                          ref={setRef}
                          nodes={graph.nodes}
                          packages={data.packages}
                          selection={
                            selection.graphId === graph.id
                              ? selection.items
                              : new Set()
                          }
                          remoteSelections={Object.values(presence).flatMap(
                            (data) => {
                              if (data.selection?.graph === graph.id)
                                return [
                                  {
                                    colour: data.colour,
                                    nodes: new Set(data.selection.nodes),
                                  },
                                ];
                              return [];
                            },
                          )}
                          onItemsSelected={(items) => {
                            setSelection(
                              reconcile({ graphId: graph.id, items }),
                            );
                          }}
                          onConnectIO={(from, to) => {
                            actions.ConnectIO(graph.id, from, to);
                          }}
                          onDisconnectIO={(io) => {
                            actions.DisconnectIO(graph.id, io);
                          }}
                          connections={graph.connections}
                          onContextMenu={(position) => {
                            setSchemaMenu({ open: true, position });
                          }}
                          onContextMenuClose={() => {
                            setSchemaMenu({ open: false });
                          }}
                          onSelectionMoved={(items) => {
                            if (selection.graphId === null) return;

                            actions.SetNodePositions(graph.id, items);
                          }}
                          onDeleteSelection={() => {
                            if (selection.graphId === null) return;
                            actions.DeleteSelection(graph.id, [
                              ...selection.items,
                            ]);
                          }}
                        ></Graph>
                        <For each={Object.entries(presence)}>
                          {(item) => (
                            <Show
                              when={
                                Number(item[0]) !== realtimeId &&
                                item[1].mouse?.graph === graph.id &&
                                item[1].mouse
                              }
                            >
                              {(mouse) => (
                                <div
                                  class="bg-white/70 rounded-full size-2 absolute -left-1 -top-1 pointer-events-none"
                                  style={{
                                    transform: `translate(${mouse().x + (bounds.left ?? 0)}px, ${mouse().y + (bounds.top ?? 0)}px)`,
                                  }}
                                >
                                  <Avatar
                                    name={item[1].name}
                                    class="absolute top-full left-full -mt-0.5 -ml-0.5 text-white rounded shadow-lg border border-gray-2"
                                    style={{
                                      "background-color": item[1].colour,
                                    }}
                                  />
                                </div>
                              )}
                            </Show>
                          )}
                        </For>

                        <Show
                          when={
                            schemaMenuPresence.present() && schemaMenuPosition()
                          }
                        >
                          {(position) => (
                            <div
                              ref={setSchemaMenuRef}
                              data-open={schemaMenu().open}
                              class={cx(
                                "absolute flex flex-col px-2 bg-gray-1 border border-gray-3 rounded-lg text-sm",
                                "origin-top-left data-[open='true']:(animate-in fade-in zoom-in-95) data-[open='false']:(animate-out fade-out zoom-out-95)",
                              )}
                              style={{
                                left: `${position().x + (bounds.left ?? 0) - 16}px`,
                                top: `${position().y + (bounds.top ?? 0) - 16}px`,
                              }}
                            >
                              <For each={Object.entries(data.packages)}>
                                {([pkgId, pkg]) => (
                                  <div class="py-1">
                                    <span class="font-bold">{pkgId}</span>
                                    <div>
                                      <For each={Object.entries(pkg.schemas)}>
                                        {([schemaId, schema]) => (
                                          <button
                                            class="block bg-transparent w-full text-left px-1 py-0.5 rounded @hover-bg-white/10 active:bg-white/10"
                                            onClick={() => {
                                              actions.CreateNode(
                                                graph.id,
                                                { pkgId, schemaId },
                                                [
                                                  position().x - 16,
                                                  position().y - 16,
                                                ],
                                              );
                                              setSchemaMenu({ open: false });
                                            }}
                                          >
                                            {schemaId}
                                          </button>
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                )}
                              </For>
                            </div>
                          )}
                        </Show>
                      </>
                    );
                  }}
                </Show>
              </div>
            );
          },
        },
        {
          path: "/packages",
          children: [
            {
              path: "/",
              component: () => (
                <Show when={Object.keys(packages)[0]}>
                  {(href) => <Navigate href={href()} />}
                </Show>
              ),
            },
            {
              path: "/:package",
              component: (props) => (
                <Show when={props.params.package} keyed>
                  {(pkg) => {
                    const PackageSettings = getPackage(pkg).Settings;

                    const [settings, settingsActions] = createResource(
                      () =>
                        rpcClient
                          .GetPackageSettings({ package: pkg })
                          .pipe(Effect.runPromise),
                      { storage: createDeepSignal },
                    );

                    Effect.gen(function* () {
                      const s = yield* eventPubSub.subscribe;

                      yield* Stream.fromQueue(s).pipe(
                        Stream.runForEach((s) =>
                          Effect.gen(function* () {
                            if (s.package === pkg) {
                              const newValue =
                                yield* rpcClient.GetPackageSettings({
                                  package: pkg,
                                });
                              settingsActions.mutate(reconcile(newValue));
                            }
                          }),
                        ),
                      );
                    }).pipe(Effect.scoped, Effect.runFork);

                    return (
                      <Show when={settings()}>
                        <PackageSettings
                          rpc={getPackage(pkg).rpcClient}
                          state={settings()}
                          globalState={globalState}
                        />
                      </Show>
                    );
                  }}
                </Show>
              ),
            },
          ],
          component: (props) => (
            <div class="flex flex-row divide-x divide-gray-5 flex-1">
              <nav class="w-40 text-sm p-2 shrink-0 flex flex-col">
                <ul class="space-y-1 flex-1">
                  <For each={Object.keys(packages)}>
                    {(name) => (
                      <li>
                        <A
                          href={name}
                          activeClass="bg-gray-5"
                          inactiveClass="bg-transparent hover:bg-gray-4"
                          class="block text-left w-full px-2 py-1 outline-none focus-visible:outline-solid rounded focus-visible:(outline-(1 yellow-4 offset-0))"
                        >
                          {name}
                        </A>
                      </li>
                    )}
                  </For>
                </ul>
                <div>{connectedClients()} Clients Connected </div>
              </nav>
              <div class="max-w-lg w-full flex flex-col items-stretch p-4 gap-4 text-sm">
                <Suspense>{props.children}</Suspense>
              </div>
            </div>
          ),
        },
      ];

      return (
        <ErrorBoundary fallback={(e) => e.toString()}>
          <Router
            root={(props) => (
              <div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default">
                <div class="flex flex-row gap-2 px-2 items-center h-10 bg-gray-2 z-10 border-b border-gray-5">
                  <A
                    class="p-1 px-2 rounded hover:bg-gray-3"
                    inactiveClass="bg-gray-2"
                    activeClass="bg-gray-3"
                    href="/packages"
                  >
                    Packages
                  </A>
                  <A
                    class="p-1 px-2 rounded hover:bg-gray-3"
                    inactiveClass="bg-gray-2"
                    activeClass="bg-gray-3"
                    href="/"
                    end
                  >
                    Graph
                  </A>
                  <Popover
                    placement="bottom-start"
                    sameWidth
                    gutter={4}
                    open={
                      Object.entries(presence).length <= 1 ? false : undefined
                    }
                  >
                    <Show
                      when={Object.entries(presence).find(
                        ([id]) => id === realtimeId?.toString(),
                      )}
                    >
                      {(data) => (
                        <Popover.Trigger
                          disabled={Object.entries(presence).length <= 1}
                          class="ml-auto bg-gray-2 p-1 rounded not-disabled:@hover-bg-gray-3 not-disabled:active:bg-gray-3 group flex flex-row items-center space-x-1 outline-none"
                        >
                          <div class="flex flex-row space-x-1.5 items-center">
                            <Avatar
                              name={data()[1].name}
                              style={{ "background-color": data()[1].colour }}
                            />
                            <span>{data()[1].name}</span>
                          </div>
                          {Object.entries(presence).length > 1 && (
                            <IconLucideChevronDown class="ui-expanded:rotate-180 transition-transform" />
                          )}
                        </Popover.Trigger>
                      )}
                    </Show>
                    <Popover.Portal>
                      <Popover.Content
                        as="ul"
                        class="outline-none flex flex-col bg-gray-1 p-1.5 pt-1 rounded text-sm ui-expanded:(animate-in slide-in-from-top-1 fade-in) ui-closed:(animate-out slide-out-to-top-1 fade-out)"
                      >
                        <span class="text-xs text-gray-10 mb-1.5">
                          Connected Clients
                        </span>
                        <ul class="space-y-1.5">
                          <For each={Object.entries(presence)}>
                            {([id, data]) => (
                              <Show when={id !== realtimeId?.toString()}>
                                <li>
                                  <div class="flex flex-row space-x-1.5 items-center">
                                    <Avatar
                                      name={data.name}
                                      style={{
                                        "background-color": data.colour,
                                      }}
                                    />
                                    <span>{data.name}</span>
                                  </div>
                                </li>
                              </Show>
                            )}
                          </For>
                        </ul>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover>
                </div>
                {props.children}
              </div>
            )}
          >
            {routes}
          </Router>
        </ErrorBoundary>
      );
    }, document.getElementById("app")!);

    yield* Effect.never;

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

function Avatar(props: { name: string } & ComponentProps<"div">) {
  return (
    <div
      {...props}
      class={cx(
        "rounded-full size-5.5 flex items-center justify-center text-[0.65rem]",
        props.class,
      )}
    >
      <span>
        {props.name
          ?.split(" ")
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase())}
      </span>
    </div>
  );
}
