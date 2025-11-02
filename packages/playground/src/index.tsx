import {
  ProjectActions,
  ProjectState,
  GraphContextProvider,
  GraphView,
  GraphContextMenu,
  GraphsSidebar,
  EditorTabs,
  CredentialsPage,
  SettingsLayout,
  PackagesSidebar,
  ProjectEffectRuntimeContext,
  mutationOptions,
  PackageSettings,
  PackageClients,
  packageSettingsQueryOptions,
} from "@macrograph/project-frontend";
import { createElementBounds } from "@solid-primitives/bounds";
import {
  QueryClient,
  QueryClientProvider,
  queryOptions,
  useMutation,
  useQuery,
} from "@tanstack/solid-query";
import { Effect, ManagedRuntime, Option } from "effect";
import {
  onMount,
  createSignal,
  Show,
  startTransition,
  batch,
  Switch,
  Match,
  Suspense,
  createEffect,
  onCleanup,
} from "solid-js";
import { createWritableMemo } from "@solid-primitives/memo";
import { makePersisted } from "@solid-primitives/storage";
import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";
import { createStore, produce, reconcile } from "solid-js/store";
import type { Graph, Node } from "@macrograph/project-domain";
import "@total-typescript/ts-reset";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";

import {
  EffectRuntimeContext,
  RuntimeLayers,
  useEffectRuntime,
  useService,
} from "./runtime";
import { PlaygroundRpc } from "./rpc";
import { loadPackages } from "./frontend";

import "@macrograph/project-frontend/styles.css";

export const effectRuntime = ManagedRuntime.make(RuntimeLayers);

namespace PaneState {
  export type PaneState =
    | {
        type: "graph";
        graphId: Graph.Id;
        selection: Node.Id[];
        transform?: { translate: { x: number; y: number }; zoom: number };
      }
    | { type: "package"; packageId: string }
    | { type: "settings"; page: "Credentials" };

  export const isGraph = (
    self: PaneState,
  ): self is Extract<PaneState, { type: "graph" }> => self.type === "graph";

  export const getKey = (state: PaneState) => {
    switch (state.type) {
      case "graph":
        return `graph-${state.graphId}`;
      case "package":
        return `package-${state.packageId}`;
      case "settings":
        return "settings";
    }
  };
}

export default function NewPlayground() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <div class="text-gray-12 font-sans w-full h-full">
      <ProjectEffectRuntimeContext.Provider value={effectRuntime}>
        <EffectRuntimeProvider runtime={effectRuntime}>
          <EffectRuntimeContext.Provider value={effectRuntime}>
            <QueryClientProvider client={client}>
              <Inner />
            </QueryClientProvider>
          </EffectRuntimeContext.Provider>
        </EffectRuntimeProvider>
      </ProjectEffectRuntimeContext.Provider>
    </div>
  );
}

function Inner() {
  const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
  const [schemaMenu, setSchemaMenu] = createSignal<
    { open: false } | { open: true; position: { x: number; y: number } }
  >({ open: false });

  const bounds = createElementBounds(ref);

  const runtime = useEffectRuntime();

  const actions = useService(ProjectActions);
  const { state, actions: stateActions } = useService(ProjectState);
  const rpc = useService(PlaygroundRpc);
  const packageClients = useService(PackageClients);

  const initialize = useMutation(() => ({
    mutationFn: () =>
      Effect.gen(function* () {
        yield* loadPackages;

        const project = yield* rpc.GetProject({});
        stateActions.setProject(project);
      }).pipe(runtime.runPromise),
  }));

  onMount(() => {
    initialize.mutate();
  });

  const [tabState, setTabState] = makePersisted(
    createStore<{
      tabs: Array<PaneState.PaneState & { tabId: number }>;
      selectedTabId: number | null;
      tabIdCounter: number;
    }>(
      { tabs: [], selectedTabId: null, tabIdCounter: 0 },
      { name: "mg-tab-state" },
    ),
  );

  const getNextTabId = () => {
    const i = tabState.tabIdCounter;
    setTabState("tabIdCounter", i + 1);
    return i;
  };

  const currentTabState = () =>
    tabState.tabs.find((state) => state.tabId === tabState.selectedTabId);

  function openTab(data: PaneState.PaneState) {
    const existing = tabState.tabs.find(
      (s) => PaneState.getKey(s) === PaneState.getKey(data),
    );
    if (existing) {
      setTabState("selectedTabId", existing.tabId);
      return;
    }

    const tabId = getNextTabId();
    startTransition(() => {
      batch(() => {
        setTabState(produce((t) => t.tabs.push({ ...data, tabId })));
        setTabState("selectedTabId", tabId);
      });
    });
    return tabId;
  }

  function removeTab(tabId: number) {
    batch(() => {
      const index = tabState.tabs.findIndex((state) => state.tabId === tabId);
      setTabState(
        produce((s) => {
          s.tabs.splice(index, 1);
          s.selectedTabId =
            s.tabs[index]?.tabId ?? s.tabs[s.tabs.length - 1]?.tabId ?? null;
        }),
      );
    });
  }

  const getSelectedSidebar = () => {
    const t = currentTabState();
    if (t?.type === "graph") return "graphs";
    if (t?.type === "package") return "packages";
    return null;
  };

  const [selectedSidebar, setSelectedSidebar] = createWritableMemo<
    "graphs" | "packages" | null
  >((v) => {
    if (v === null) return null;
    return getSelectedSidebar() ?? v;
  }, getSelectedSidebar());

  const mouse = createMousePosition();

  return (
    <div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-3">
      <div class="flex flex-row items-center h-9 z-10 bg-gray-4">
        <button
          type="button"
          onClick={() => {
            setSelectedSidebar(
              selectedSidebar() === "packages" ? null : "packages",
            );
          }}
          data-selected={selectedSidebar() === "packages"}
          class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
        >
          Packages
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedSidebar(
              selectedSidebar() === "graphs" ? null : "graphs",
            );
          }}
          data-selected={selectedSidebar() === "graphs"}
          class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
        >
          Graphs
        </button>
        <div class="flex-1" />
        <button
          type="button"
          class="px-3 hover:bg-gray-3 h-full flex items-center justify-center bg-transparent data-[selected='true']:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
          onClick={() => {
            openTab({ type: "settings", page: "Credentials" });
          }}
        >
          Settings
        </button>
        {/*<AuthSection />*/}
      </div>
      <Show when={initialize.isSuccess}>
        <div class="flex flex-row flex-1 divide-x divide-gray-5 h-full">
          <Show when={selectedSidebar()}>
            <div class="w-56 h-full flex flex-col items-stretch justify-start divide-y divide-gray-5 shrink-0">
              <Switch>
                <Match when={selectedSidebar() === "graphs"}>
                  <GraphsSidebar
                    graphs={state.graphs}
                    selected={(() => {
                      const s = currentTabState();
                      if (s?.type === "graph") return s.graphId;
                    })()}
                    onSelected={(graph) => {
                      openTab({
                        type: "graph",
                        graphId: graph.id,
                        selection: [],
                      });
                    }}
                  />
                </Match>
                <Match when={selectedSidebar() === "packages"}>
                  <PackagesSidebar
                    packageId={(() => {
                      const s = currentTabState();
                      if (s?.type === "package") return s.packageId;
                    })()}
                    onChange={(packageId) =>
                      openTab({ type: "package", packageId })
                    }
                  />
                </Match>
              </Switch>
            </div>
          </Show>

          <EditorTabs
            schema={{
              graph: {
                getMeta: (tab) => ({ title: tab.graph.name }),
                Component: (tab) => {
                  createEventListener(window, "keydown", (e) => {
                    if (e.code === "Backspace" || e.code === "Delete") {
                      actions.DeleteSelection(
                        rpc.DeleteSelection,
                        tab().graphId,
                        tab().selection,
                      );
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

                  return (
                    <GraphContextProvider
                      bounds={bounds}
                      translate={tab().transform?.translate}
                    >
                      <GraphView
                        ref={setRef}
                        nodes={tab().graph.nodes}
                        connections={tab().graph.connections}
                        selection={tab().selection}
                        getSchema={(ref) =>
                          Option.fromNullable(
                            state.packages[ref.pkgId]?.schemas[ref.schemaId],
                          )
                        }
                        onContextMenu={(e) => {
                          setSchemaMenu({
                            open: true,
                            position: { x: e.clientX, y: e.clientY },
                          });
                        }}
                        onContextMenuClose={() => {
                          setSchemaMenu({ open: false });
                        }}
                        onItemsSelected={(selection) => {
                          setTabState(
                            "tabs",
                            (tab) => tab.tabId === tabState.selectedTabId,
                            produce((tab) => {
                              if (tab.type !== "graph") return;

                              tab.selection = selection;
                            }),
                          );
                        }}
                        onSelectionMoved={(items) => {
                          actions.SetNodePositions(
                            rpc.SetNodePositions,
                            tab().graph.id,
                            items,
                          );
                        }}
                        onConnectIO={(from, to) => {
                          actions.ConnectIO(
                            rpc.ConnectIO,
                            tab().graph.id,
                            from,
                            to,
                          );
                        }}
                        onDisconnectIO={(io) => {
                          actions.DisconnectIO(
                            rpc.DisconnectIO,
                            tab().graph.id,
                            io,
                          );
                        }}
                        onDeleteSelection={() => {
                          actions.DeleteSelection(
                            rpc.DeleteSelection,
                            tab().graph.id,
                            [...tab().selection],
                          );
                        }}
                        onTranslateChange={(translate) => {
                          setTabState(
                            "tabs",
                            (tab) => tab.tabId === tabState.selectedTabId,
                            produce((tab) => {
                              if (tab.type !== "graph") return;

                              tab.transform ??= {
                                translate: { x: 0, y: 0 },
                                zoom: 1,
                              };
                              tab.transform.translate = translate;
                            }),
                          );
                        }}
                      />
                      <GraphContextMenu
                        position={(() => {
                          const s = schemaMenu();
                          if (s.open) return s.position;
                          return null;
                        })()}
                        onSchemaClick={(schemaRef) => {
                          actions.CreateNode(
                            rpc.CreateNode,
                            tab().graph.id,
                            schemaRef,
                            [schemaRef.position.x, schemaRef.position.y],
                          );
                          setSchemaMenu({ open: false });
                        }}
                        packages={state.packages}
                      />
                    </GraphContextProvider>
                  );
                },
              },
              settings: {
                getMeta: (tab) => ({ title: "Settings", desc: tab.page }),
                Component: (tab) => (
                  <SettingsLayout
                    pages={[
                      {
                        name: "Credentials",
                        page: "Credentials" as const,
                        Component() {
                          const credentials = useQuery(() =>
                            credentialsQuery(runtime),
                          );

                          const refetchCredentials = useMutation(() =>
                            refetchCredentialsMutation(runtime),
                          );

                          return (
                            <CredentialsPage
                              description="The credentials connected to your MacroGraph account."
                              credentials={credentials}
                              onRefetch={() =>
                                refetchCredentials
                                  .mutateAsync()
                                  .then(() => credentials.refetch())
                              }
                            />
                          );
                        },
                      },
                    ]}
                    page={tab().page}
                    onChange={(page) => {
                      setTabState(
                        produce((s) => {
                          const t = s.tabs.find(
                            (t) => t.tabId === tabState.selectedTabId,
                          );
                          if (t?.type === "settings") {
                            t.page = page;
                          }
                        }),
                      );
                    }}
                  />
                ),
              },
              package: {
                getMeta: (tab) => ({ title: tab.packageId, desc: "Package" }),
                Component: (tab) => {
                  const rpc = useService(PlaygroundRpc);

                  const settingsQuery = useQuery(() =>
                    packageSettingsQueryOptions(tab().packageId, (req) =>
                      rpc.GetPackageSettings(req).pipe(runtime.runPromise),
                    ),
                  );

                  return (
                    <PackageSettings
                      package={tab().package}
                      settingsQuery={settingsQuery}
                    />
                  );
                },
              },
            }}
            state={tabState.tabs
              .map((tab) => {
                if (tab.type === "graph") {
                  const graph = state.graphs[tab.graphId];
                  if (!graph) return;
                  return { ...tab, graph };
                }
                if (tab.type === "settings") return tab;
                if (tab.type === "package") {
                  return packageClients.getPackage(tab.packageId).pipe(
                    Option.map((pkg) => ({ ...tab, package: pkg })),
                    Option.getOrUndefined,
                  );
                }
              })
              .filter(Boolean)}
            selectedTabId={tabState.selectedTabId}
            onChange={(id) => setTabState("selectedTabId", id)}
            onRemove={(id) => removeTab(id)}
          />
        </div>
      </Show>
    </div>
  );
}

const credentialsQuery = (
  r: ManagedRuntime.ManagedRuntime<PlaygroundRpc, never>,
) =>
  queryOptions({
    queryKey: ["credentials"],
    queryFn: () =>
      PlaygroundRpc.pipe(
        Effect.flatMap((rpc) => rpc.GetCredentials()),
        r.runPromise,
      ),
  });

const refetchCredentialsMutation = (
  r: ManagedRuntime.ManagedRuntime<PlaygroundRpc, never>,
) =>
  mutationOptions({
    mutationKey: ["refetchCredentials"],
    mutationFn: () =>
      PlaygroundRpc.pipe(
        Effect.flatMap((rpc) => rpc.RefetchCredentials()),
        r.runPromise,
      ),
  });

// import {
//   Atom,
//   Registry,
//   useAtomResource,
//   useAtomSet,
// } from "@effect-atom/atom-solid";
// import { BackendLayers } from "./backend";

// const atomRuntime = Atom.runtime(
//   PlaygroundRpc.Default.pipe(
//     Layer.provide(BackendLayers),
//     Layer.provide(Layer.scope),
//   ),
// );

// const credentialsAtom = atomRuntime.atom(
//   Effect.flatMap(PlaygroundRpc, (rpc) => rpc.GetCredentials()).pipe(
//     Effect.zipLeft(Effect.sleep("1 seconds")),
//   ),
// );

// const refetchCredentialsAtom = atomRuntime.fn(
//   Effect.fn(function* () {
//     const rpc = yield* PlaygroundRpc;
//     const atomRegistry = yield* Registry.AtomRegistry;

//     yield* Effect.sleep("1 seconds");
//     yield* rpc.RefreshCredentials();
//     atomRegistry.refresh(credentialsAtom);
//   }),
// );
