import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Brand, Layer, Match, PubSub, Schema, Stream } from "effect";
import * as Effect from "effect/Effect";
import { render } from "solid-js/web";
import {
  createResource,
  createRoot,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { BrowserRuntime, BrowserSocket } from "@effect/platform-browser";
import { A, RouteDefinition, Router } from "@solidjs/router";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  Socket,
} from "@effect/platform";
import { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import { createDeepSignal } from "@solid-primitives/resource";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import { cx } from "cva";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./style.css";

import { GlobalAppState } from "./package-settings-utils";
import { PackageMeta, ProjectEvent, Rpcs, RpcsSerialization } from "./shared";
import { Node, NodeHeader } from "./components/Node";
import { NodeRpcs } from "./domain/Node/rpc";
import { NodeId, XY } from "./domain/Node/data";
import { GraphId } from "./domain/Graph/data";
import { SchemaRef } from "./domain/Package/data";
import { DeepWriteable } from "./types";

const API_HOST = "localhost:5678";

const [packages, setPackages] = createStore<Record<string, { id: string }>>({});

const SocketLayer = BrowserSocket.layerWebSocket(`ws://${API_HOST}/realtime`);

let realtimeId: null | number = null;

const RpcTransport = RpcClient.layerProtocolHttp({
  url: `http://${API_HOST}/rpc`,
  transformClient: HttpClient.mapRequest((request) =>
    HttpClientRequest.setHeader(
      request,
      "x-mg-realtime-id",
      (realtimeId ?? -1).toString(),
    ),
  ),
}).pipe(Layer.provide(FetchHttpClient.layer), Layer.provide(RpcsSerialization));

class Client extends Effect.Service<Client>()("Client", {
  effect: Effect.gen(function* () {
    const client = yield* RpcClient.make(Rpcs.merge(NodeRpcs));

    return { client };
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
            const client = yield* RpcClient.make(pkg.Rpcs).pipe(
              Effect.provide(
                RpcClient.layerProtocolHttp({
                  url: `http://${API_HOST}/package/${name}/rpc`,
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

    const _data = yield* rpcClient.GetProject();
    const [data, setData] = createStore(
      _data as any as DeepWriteable<typeof _data>,
    );

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
                console.log({ data });
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
              Match.exhaustive,
            );
          }
        }),
      )
      .pipe(Effect.fork);

    yield* realtimeIdLatch.await;

    const [selections, setSelections] = createSignal<NodeId[]>([]);

    function getGraphPosition(e: MouseEvent) {
      return {
        x: e.clientX,
        y: e.clientY,
      };
    }

    const actions = {
      SetNodePosition: (
        graphId: GraphId,
        nodeId: NodeId,
        position: (typeof XY)["Type"],
        ephemeral = true,
      ) => {
        rpcClient
          .SetNodePosition({ nodeId, graphId, position })
          .pipe(Effect.runPromise);
        setData(
          produce((data) => {
            const node = data.graphs[graphId]?.nodes.find(
              (n) => n.id === nodeId,
            );
            if (node) node.position = position;
          }),
        );
      },
      CreateNode: (schema: SchemaRef) => {
        Effect.gen(function* () {
          const resp = yield* rpcClient.CreateNode({ schema });

          data.graphs[0]?.nodes.push({
            schema,
            id: resp.id,
            position: { x: 0, y: 0 },
            inputs: resp.io.inputs as DeepWriteable<typeof resp.io.inputs>,
            outputs: resp.io.outputs as DeepWriteable<typeof resp.io.outputs>,
          });
        }).pipe(Effect.runPromise);
      },
    };

    const dispose = render(() => {
      const routes: RouteDefinition[] = [
        {
          path: "/",
          component: () => {
            return (
              <div class="flex flex-row">
                <div
                  class="relative flex-1 flex flex-col gap-4 items-start w-full touch-none"
                  onPointerMove={(e) => e.preventDefault()}
                >
                  <Show when={data.graphs["0"]}>
                    {(graph) => (
                      <For each={graph().nodes}>
                        {(node) => {
                          const [position, setPosition] = createSignal<
                            null | typeof node.position
                          >(null);

                          const schema = () =>
                            data.packages[node.schema.pkgId]?.schemas[
                              node.schema.schemaId
                            ];

                          return (
                            <Show when={schema()}>
                              {(schema) => (
                                <Node
                                  {...node}
                                  position={position() ?? node.position}
                                  selected={selections().includes(node.id)}
                                >
                                  <NodeHeader
                                    name={node.name ?? schema().id}
                                    variant={schema().type}
                                    onPointerDown={(downEvent) => {
                                      if (downEvent.metaKey)
                                        setSelections((s) => [...s, node.id]);
                                      else setSelections([node.id]);

                                      const startPosition = {
                                        x: node.position.x,
                                        y: node.position.y,
                                      };
                                      const downPosition =
                                        getGraphPosition(downEvent);
                                      setPosition(startPosition);

                                      createRoot((dispose) => {
                                        createEventListenerMap(window, {
                                          pointermove: (moveEvent) => {
                                            if (
                                              downEvent.pointerId !==
                                              moveEvent.pointerId
                                            )
                                              return;

                                            moveEvent.preventDefault();

                                            const movePosition =
                                              getGraphPosition(moveEvent);

                                            const position = {
                                              x:
                                                startPosition.x +
                                                movePosition.x -
                                                downPosition.x,
                                              y:
                                                startPosition.y +
                                                movePosition.y -
                                                downPosition.y,
                                            };

                                            actions.SetNodePosition(
                                              GraphId.make(0),
                                              node.id,
                                              position,
                                            );
                                            setPosition(position);
                                          },
                                          pointerup: (upEvent) => {
                                            if (
                                              downEvent.pointerId !==
                                              upEvent.pointerId
                                            )
                                              return;

                                            const upPosition =
                                              getGraphPosition(upEvent);

                                            const position = {
                                              x:
                                                startPosition.x +
                                                upPosition.x -
                                                downPosition.x,
                                              y:
                                                startPosition.y +
                                                upPosition.y -
                                                downPosition.y,
                                            };

                                            actions.SetNodePosition(
                                              GraphId.make(0),
                                              node.id,
                                              position,
                                            );
                                            setPosition(null);

                                            dispose();
                                          },
                                        });
                                      });
                                    }}
                                  />
                                </Node>
                              )}
                            </Show>
                          );
                        }}
                      </For>
                    )}
                  </Show>
                </div>
                <div class={cx("flex flex-col p-2")}>
                  <For each={Object.entries(data.packages)}>
                    {([pkgId, pkg]) => (
                      <div class="py-1">
                        <span class="font-bold">{pkgId}</span>
                        <div>
                          <For each={Object.entries(pkg.schemas)}>
                            {([schemaId, schema]) => (
                              <div
                                class="px-1 py-0.5 rounded hover:bg-white/10"
                                onClick={() => {
                                  actions.CreateNode({ pkgId, schemaId });
                                }}
                              >
                                {schemaId}
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            );
          },
        },
        {
          path: "/packages",
          children: [
            { path: "/" },
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
                <div>{connectedClients()} Clients Connected</div>
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
              <div class="w-full h-full flex flex-col divide-y divide-gray-5 overflow-hidden">
                <div class="p-2 flex flex-row gap-2">
                  <a href="/packages">Packages</a>
                  <a href="/">Graph</a>
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

function sliceRequestUrl(request: HttpServerRequest, prefix: string) {
  const prefexLen = prefix.length;
  return request.modify({
    url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen),
  });
}
