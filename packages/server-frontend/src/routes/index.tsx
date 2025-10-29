import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { Effect, Option, Stream } from "effect";
import {
  For,
  Show,
  Suspense,
  createEffect,
  createSignal,
  startTransition,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";

import { Match, Switch } from "solid-js";
import type { Graph, Node } from "@macrograph/server-domain";
import { Dynamic } from "solid-js/web";
import { Dialog } from "@kobalte/core";
import { Button, EffectButton } from "@macrograph/package-sdk/ui";
import type { ValidComponent } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import { createWritableMemo } from "@solid-primitives/memo";
import { makePersisted } from "@solid-primitives/storage";
import { GraphsSidebar } from "@macrograph/project-frontend";

import { useEffectQuery, useProjectService } from "../AppRuntime";
import { GraphContextProvider } from "../Graph/Context";
import { GraphContextMenu } from "../Graph/ContextMenu";
import { GraphView } from "../Graph/Graph";
import { PresencePointer } from "../Graph/PresencePointer";
import { usePresenceContext } from "../Presence/Context";
import { ProjectActions } from "../Project/Actions";
import { ProjectRpc } from "../Project/Rpc";
import { ProjectState } from "../Project/State";
import { useRealtimeContext } from "../Realtime";
import { PackagesSettings } from "../Packages/PackagesSettings";
import ServerSettings from "./settings/server";
import CredentialsSettings from "./settings/credentials";
import { AuthActions } from "../Auth";
import { ClientListDropdown } from "../Presence/ClientListDropdown";
import { batch } from "solid-js";
import { MatchEffectQuery } from "../effect-query/components";
import { createScopedEffect } from "../effect-query/hooks";

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

export default function () {
  const { state } = useProjectService(ProjectState);
  const actions = useProjectService(ProjectActions);
  const packagesSettings = useProjectService(PackagesSettings);
  const rpc = useProjectService(ProjectRpc.client);

  const presence = usePresenceContext();
  const realtime = useRealtimeContext();

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
            openTab({ type: "settings", page: "Server" });
          }}
        >
          Settings
        </button>
        <AuthSection />
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
                  const packagesSettings = useProjectService(PackagesSettings);

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
                        if (tab.type === "settings")
                          return (
                            <>
                              <span>{tab.page}</span>
                              <span class="ml-1 text-xs text-gray-11">
                                Settings
                              </span>
                            </>
                          );
                      })()}
                    </button>
                    <div class="opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute inset-y-0.5 pl-2 pr-1 right-0 flex items-center justify-center bg-gradient-to-gray-3 to-20% group-data-[selected='true']:(bg-gradient-to-gray-2 to-20%) bg-gradient-to-r from-transparent">
                      <button
                        type="button"
                        class="bg-transparent hover:bg-gray-6 p-0.5 focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
                        onClick={() => removeTab(tab.tabId)}
                      >
                        <IconBiX class="size-3.5" />
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
                  const [selection, setSelection] = createStore<
                    | { graphId: Graph.Id; items: Set<Node.Id> }
                    | { graphId: null }
                  >({ graphId: null });

                  const [ref, setRef] = createSignal<HTMLDivElement | null>(
                    null,
                  );

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
                    rpc
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

                  createEventListener(
                    () => ref() ?? undefined,
                    "pointermove",
                    (e) => {
                      rpc
                        .SetMousePosition({
                          graph: graph.id,
                          position: {
                            x: e.clientX - (bounds.left ?? 0),
                            y: e.clientY - (bounds.top ?? 0),
                          },
                        })
                        .pipe(Effect.runPromise);
                    },
                  );

                  return (
                    <div class="w-full h-full bg-gray-2 flex">
                      <GraphContextProvider bounds={bounds}>
                        <GraphView
                          ref={setRef}
                          nodes={graph.nodes}
                          getSchema={(ref) =>
                            Option.fromNullable(
                              state.packages[ref.pkgId]?.schemas[ref.schemaId],
                            )
                          }
                          selection={
                            selection.graphId === graph.id
                              ? selection.items
                              : new Set()
                          }
                          remoteSelections={Object.entries(
                            presence.clients,
                          ).flatMap(([userId, data]) => {
                            if (Number(userId) === realtime.id()) return [];

                            if (data.selection?.graph === graph.id)
                              return [
                                {
                                  colour: data.colour,
                                  nodes: new Set(data.selection.nodes),
                                },
                              ];
                            return [];
                          })}
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
                        />
                        <For each={Object.entries(presence.clients)}>
                          {(item) => (
                            <Show
                              when={
                                Number(item[0]) !== realtime.id() &&
                                item[1].mouse?.graph === graph.id &&
                                item[1].mouse
                              }
                            >
                              {(mouse) => (
                                <PresencePointer
                                  style={{
                                    transform: `translate(${
                                      mouse().x + (bounds.left ?? 0)
                                    }px, ${mouse().y + (bounds.top ?? 0)}px)`,
                                  }}
                                  name={item[1].name}
                                  colour={item[1].colour}
                                />
                              )}
                            </Show>
                          )}
                        </For>

                        <GraphContextMenu
                          packages={state.packages}
                          position={(() => {
                            const s = schemaMenu();
                            if (s.open) return s.position;
                            return null;
                          })()}
                          onSchemaClick={(schemaRef) => {
                            actions.CreateNode(graph.id, schemaRef, [
                              schemaRef.position.x,
                              schemaRef.position.y,
                            ]);
                            setSchemaMenu({ open: false });
                          }}
                        />
                      </GraphContextProvider>
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
                  const rpc = useProjectService(ProjectRpc.client);

                  const state = useEffectQuery(() => ({
                    queryKey: ["package-state", settings().id] as const,
                    queryFn: ({ queryKey }) =>
                      rpc.GetPackageSettings({ package: queryKey[1] }),
                    reconcile: (o, n) => reconcile(n)(o),
                  }));

                  createScopedEffect(() =>
                    settings().settingsChanges.pipe(
                      Effect.flatMap(
                        Stream.runForEach(() =>
                          Effect.sync(() => state.refetch()),
                        ),
                      ),
                    ),
                  );

                  return (
                    <div class="w-full h-full bg-gray-2">
                      <div class="flex flex-col items-stretch w-full max-w-120 p-4">
                        <MatchEffectQuery
                          query={state}
                          onSuccess={(state) => (
                            <Dynamic
                              component={settings().SettingsUI}
                              rpc={settings().rpcClient}
                              state={state()}
                              globalState={{
                                auth: { state: "logged-in", userId: "" },
                                logsPanelOpen: false,
                              }}
                            />
                          )}
                        />
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
                            { name: "Server", page: "Server" as const },
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
                                <Match when={settings().page === "Server"}>
                                  <ServerSettings />
                                </Match>
                                <Match when={settings().page === "Credentials"}>
                                  <CredentialsSettings />
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

function AuthSection() {
  const rpc = useProjectService(ProjectRpc.client);

  const user = useEffectQuery(() => ({
    queryKey: ["user"],
    queryFn: () => rpc.GetUser(),
  }));

  return (
    <>
      <ClientListDropdown />
      {user.data && Option.isNone(user.data) && <ClientLoginButton />}
    </>
  );
}

function ClientLoginButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = createSignal(false);
  const authActions = useProjectService(AuthActions);

  return (
    <Dialog.Root open={open()} onOpenChange={setOpen}>
      <Dialog.Trigger<ValidComponent>
        as={(props) => <Button {...props} shape="block" />}
      >
        Login
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 animate-in fade-in" />
        <div class="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in-95">
          <Dialog.Content class="z-50 bg-gray-1 p-4">
            <span>Login</span>
            <p>Use the button below to login via macrograph.app</p>
            <EffectButton
              onClick={() =>
                authActions.login.pipe(
                  Effect.zipLeft(
                    Effect.promise(() => {
                      setOpen(false);
                      return queryClient.invalidateQueries();
                    }),
                  ),
                )
              }
            >
              Open Login Page
            </EffectButton>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
