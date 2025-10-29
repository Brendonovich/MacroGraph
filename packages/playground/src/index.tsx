import {
  ProjectActions,
  ProjectState,
  GraphContextProvider,
  GraphView,
  GraphContextMenu,
  GraphsSidebar,
  PackagesSettings,
} from "@macrograph/project-frontend";
import { createElementBounds } from "@solid-primitives/bounds";
import {
  QueryClient,
  QueryClientProvider,
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
  For,
  Suspense,
} from "solid-js";
import { createWritableMemo } from "@solid-primitives/memo";
import { makePersisted } from "@solid-primitives/storage";

import {
  EffectRuntimeContext,
  RuntimeLayers,
  useEffectRuntime,
  useService,
} from "./runtime";
import { PlaygroundRpc } from "./rpc";

import "@macrograph/project-frontend/styles.css";
import { createStore, produce, reconcile } from "solid-js/store";
import { Graph } from "@macrograph/project-domain";
import { loadPackages } from "./frontend";
import { Dynamic } from "solid-js/web";
import { EffectRuntimeProvider } from "@macrograph/package-sdk/ui";

export const effectRuntime = ManagedRuntime.make(RuntimeLayers);

namespace PaneState {
  export type PaneState =
    | { type: "graph"; graphId: Graph.Id }
    | { type: "package"; package: string }
    | { type: "settings"; page: "Server" | "Credentials" };

  export const isGraph = (
    self: PaneState,
  ): self is Extract<PaneState, { type: "graph" }> => self.type === "graph";

  export const getKey = (state: PaneState) => {
    switch (state.type) {
      case "graph":
        return `graph-${state.graphId}`;
      case "package":
        return `package-${state.package}`;
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
    <div class="dark text-gray-12 font-sans w-full h-full">
      <EffectRuntimeProvider runtime={effectRuntime}>
        <EffectRuntimeContext.Provider value={effectRuntime}>
          <QueryClientProvider client={client}>
            <Inner />
          </QueryClientProvider>
        </EffectRuntimeContext.Provider>
      </EffectRuntimeProvider>
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
  const packagesSettings = useService(PackagesSettings);

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

  const [selectedSidebar, setSelectedSidebar] = createWritableMemo<
    "graphs" | "packages" | null
  >((v) => {
    const t = currentTabState();
    if (v === null) return null;
    if (t?.type === "graph") return "graphs";
    if (t?.type === "package") return "packages";
    return v;
  }, "graphs");

  return (
    <div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5 bg-gray-4">
      <div class="flex flex-row items-center h-9 z-10">
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
            // openTab({ type: "settings", page: "Server" });
          }}
        >
          Settings
        </button>
        {/*<AuthSection />*/}
      </div>
      <div class="flex flex-row flex-1 divide-x divide-gray-5 h-full bg-gray-3">
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
                    openTab({ type: "graph", graphId: graph.id });
                  }}
                />
              </Match>
              <Match when={selectedSidebar() === "packages"}>
                {(_) => {
                  const packagesSettings = useService(PackagesSettings);

                  return (
                    <>
                      <input
                        class="px-2 bg-gray-3 dark:bg-gray-2 h-8 text-sm focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
                        placeholder="Search Packages"
                      />
                      <ul>
                        <For each={packagesSettings.listPackages()}>
                          {(pkg) => (
                            <Show when={state.packages[pkg]}>
                              <li>
                                <button
                                  type="button"
                                  class="w-full data-[selected='true']:bg-gray-2  hover:bg-gray-2 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
                                  data-selected={(() => {
                                    const s = currentTabState();
                                    return (
                                      s?.type === "package" && s.package === pkg
                                    );
                                  })()}
                                  onClick={() =>
                                    openTab({ type: "package", package: pkg })
                                  }
                                >
                                  {pkg}
                                </button>
                              </li>
                            </Show>
                          )}
                        </For>
                      </ul>
                    </>
                  );
                }}
              </Match>
            </Switch>
          </div>
        </Show>

        <div class="flex flex-col items-stretch flex-1 overflow-hidden">
          <Show when={tabState.tabs.length > 0}>
            <ul class="flex flex-row items-start divide-x divide-gray-5 overflow-x-auto scrollbar-none shrink-0">
              <For each={tabState.tabs}>
                {(tab) => (
                  <li
                    class="h-8 relative group"
                    data-selected={tab.tabId === tabState.selectedTabId}
                  >
                    <button
                      type="button"
                      class="h-full px-4 flex flex-row items-center bg-gray-3 group-data-[selected='true']:(bg-gray-2 border-transparent) border-b border-gray-5 focus-visible:(ring-1 ring-inset ring-yellow outline-none) text-nowrap"
                      onClick={() => setTabState("selectedTabId", tab.tabId)}
                    >
                      {(() => {
                        if (tab.type === "graph") {
                          const graph = state.graphs[tab.graphId];
                          return graph?.name ?? `Graph ${tab.graphId}`;
                        }
                        if (tab.type === "package")
                          return (
                            <>
                              <span>{tab.package}</span>
                              <span class="ml-1 text-xs text-gray-11">
                                Package
                              </span>
                            </>
                          );
                        // if (tab.type === "settings")
                        //   return (
                        //     <>
                        //       <span>{tab.page}</span>
                        //       <span class="ml-1 text-xs text-gray-11">
                        //         Settings
                        //       </span>
                        //     </>
                        //   );
                      })()}
                    </button>
                    <div class="opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute inset-y-0.5 pl-2 pr-1 right-0 flex items-center justify-center bg-gradient-to-gray-3 to-20% group-data-[selected='true']:(bg-gradient-to-gray-2 to-20%) bg-gradient-to-r from-transparent">
                      <button
                        type="button"
                        class="bg-transparent hover:bg-gray-6 p-0.5 focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
                        onClick={() => removeTab(tab.tabId)}
                      >
                        {/*<IconBiX class="size-3.5" />*/}
                      </button>
                    </div>
                  </li>
                )}
              </For>
              <div class="h-full flex-1 border-b border-gray-5" />
            </ul>
          </Show>

          <Suspense>
            <Switch>
              <Match
                when={(() => {
                  const s = currentTabState();
                  if (s?.type === "graph") return state.graphs[s.graphId];
                })()}
                keyed
              >
                {(graph) => {
                  return (
                    <div class="w-full h-full bg-gray-2 flex">
                      <Show when={initialize.isSuccess}>
                        <GraphContextProvider bounds={bounds}>
                          <GraphView
                            ref={setRef}
                            nodes={graph.nodes}
                            getSchema={(ref) =>
                              Option.fromNullable(
                                state.packages[ref.pkgId]?.schemas[
                                  ref.schemaId
                                ],
                              )
                            }
                            onContextMenu={(position) => {
                              setSchemaMenu({ open: true, position });
                            }}
                            onContextMenuClose={() => {
                              setSchemaMenu({ open: false });
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
                                graph.id,
                                schemaRef,
                                [schemaRef.position.x, schemaRef.position.y],
                              );
                              setSchemaMenu({ open: false });
                            }}
                            packages={state.packages}
                          />
                        </GraphContextProvider>
                      </Show>
                    </div>
                  );
                }}
              </Match>
              <Match
                when={(() => {
                  const s = currentTabState();
                  if (s?.type === "package")
                    return Option.getOrUndefined(
                      packagesSettings.getPackage(s.package)?.pipe(
                        Option.map((stuff) => ({
                          ...stuff,
                          id: s.package,
                        })),
                      ),
                    );
                })()}
              >
                {(settings) => {
                  const state = useQuery(() => ({
                    queryKey: ["package-state", settings().id] as const,
                    queryFn: ({ queryKey }) =>
                      rpc
                        .GetPackageSettings({ package: queryKey[1] })
                        .pipe(runtime.runPromise),
                    reconcile: (o, n) => reconcile(n)(o),
                  }));

                  // createScopedEffect(() =>
                  //   settings().settingsChanges.pipe(
                  //     Effect.flatMap(
                  //       Stream.runForEach(() =>
                  //         Effect.sync(() => state.refetch()),
                  //       ),
                  //     ),
                  //   ),
                  // );

                  return (
                    <div class="w-full h-full bg-gray-2">
                      <div class="flex flex-col items-stretch w-full max-w-120 p-4">
                        {state.isSuccess && (
                          <Dynamic
                            component={settings().SettingsUI}
                            rpc={settings().rpcClient}
                            state={state.data}
                            globalState={{
                              auth: { state: "logged-in", userId: "" },
                              logsPanelOpen: false,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                }}
              </Match>
              <Match
                when={(() => {
                  const s = currentTabState();
                  if (s?.type === "settings") return s;
                })()}
              >
                {(settings) => (
                  <div class="flex flex-row divide-x divide-gray-5 flex-1 bg-gray-2">
                    <nav class="w-40 text-sm shrink-0 flex flex-col">
                      <span class="px-1 py-1 text-xs text-gray-10 font-medium">
                        Admin
                      </span>
                      <ul class="flex-1">
                        <For
                          each={[
                            // { name: "Server", page: "Server" as const },
                            {
                              name: "Credentials",
                              page: "Credentials" as const,
                            },
                          ]}
                        >
                          {(item) => (
                            <li>
                              <button
                                type="button"
                                data-selected={item.page === settings().page}
                                class="w-full data-[selected='true']:bg-gray-3 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
                                onClick={() => {
                                  setTabState(
                                    produce((s) => {
                                      const t = s.tabs.find(
                                        (t) =>
                                          t.tabId === tabState.selectedTabId,
                                      );
                                      if (t?.type === "settings") {
                                        t.page = item.page;
                                      }
                                    }),
                                  );
                                }}
                              >
                                {item.name}
                              </button>
                            </li>
                          )}
                        </For>
                      </ul>
                    </nav>
                    <div class="max-w-lg w-full flex flex-col items-stretch p-4 text-sm">
                      <Suspense>
                        <Switch>
                          <Match
                            when={(() => {
                              const s = settings();
                              if (s.type === "settings") return s;
                            })()}
                          >
                            {(settings) => (
                              <Switch>
                                {/*<Match when={settings().page === "Server"}>
                                  <ServerSettings />
                                </Match>*/}
                                <Match when={settings().page === "Credentials"}>
                                  {(_) => {
                                    const credentials = useQuery(() => ({
                                      queryKey: ["credentials"],
                                      queryFn: () =>
                                        rpc
                                          .GetCredentials()
                                          .pipe(runtime.runPromise),
                                    }));

                                    return (
                                      <>
                                        <div class="flex flex-row justify-between mb-3">
                                          <div>
                                            <span class="text-xl font-bold">
                                              Credentials
                                            </span>
                                            <p class="text-gray-11 mt-1">
                                              The credentials connected to this
                                              server's MacroGraph account.
                                            </p>
                                          </div>
                                          <EffectButton
                                            disabled={!credentials.isSuccess}
                                            onClick={() =>
                                              rpc
                                                .RefetchCredentials()
                                                .pipe(
                                                  Effect.tapErrorCause((v) =>
                                                    Effect.log(
                                                      JSON.stringify(v),
                                                    ),
                                                  ),
                                                )
                                            }
                                          >
                                            Refetch
                                          </EffectButton>
                                        </div>
                                        <MatchEffectQuery
                                          query={credentials}
                                          onError={(e) => {
                                            if (Cause.isFailType(e)) {
                                              switch (e.error._tag) {
                                                case "NoRegistrationError":
                                                  return "Register this server to your account to view credentials";
                                              }
                                            }

                                            return "An error occurred";
                                          }}
                                          onSuccess={(data) => (
                                            <ul class="divide-gray-5 divide-y">
                                              {data().map((credential) => (
                                                <li class="py-1 flex flex-row justify-between items-center">
                                                  <div class="flex flex-col items-start">
                                                    <span class="">
                                                      {credential.displayName ??
                                                        credential.providerUserId}
                                                    </span>
                                                    <pre class="text-gray-11">
                                                      {
                                                        credential.providerUserId
                                                      }
                                                    </pre>
                                                  </div>
                                                  <span>
                                                    {credential.providerId}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        />
                                      </>
                                    );
                                  }}
                                </Match>
                              </Switch>
                            )}
                          </Match>
                        </Switch>
                      </Suspense>
                    </div>
                  </div>
                )}
              </Match>
            </Switch>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
