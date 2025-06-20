import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { Effect, Option } from "effect";
import { createEffect, createSignal, For, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import { GraphId } from "../../domain/Graph/data";
import { NodeId } from "../../domain/Node/data";
import { useProjectService } from "../AppRuntime";
import { GraphContextProvider } from "../Graph/Context";
import { GraphContextMenu } from "../Graph/ContextMenu";
import { Graph } from "../Graph/Graph";
import { PresencePointer } from "../Graph/PresencePointer";
import { usePresenceContext } from "../Presence/Context";
import { ProjectActions } from "../Project/Actions";
import { ProjectRpc } from "../Project/Rpc";
import { ProjectState } from "../Project/State";
import { useRealtimeContext } from "../Realtime";

const GRAPH_ID = "0";

export default function () {
  const { state } = useProjectService(ProjectState);
  const actions = useProjectService(ProjectActions);
  const rpc = useProjectService(ProjectRpc.client);

  const presence = usePresenceContext();
  const realtime = useRealtimeContext();

  return (
    <div class="flex flex-row flex-1 overflow-hidden">
      <Show when={state.graphs[GRAPH_ID]} keyed>
        {(graph) => {
          const [selection, setSelection] = createStore<
            { graphId: GraphId; items: Set<NodeId> } | { graphId: null }
          >({ graphId: null });

          const [ref, setRef] = createSignal<HTMLElement | null>(null);

          const bounds = createElementBounds(ref);
          const mouse = createMousePosition();

          const [schemaMenu, setSchemaMenu] = createSignal<
            { open: false } | { open: true; position: { x: number; y: number } }
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

          createEventListener(window, "pointermove", (e) => {
            rpc
              .SetMousePosition({
                graph: graph.id,
                position: {
                  x: e.clientX - (bounds.left ?? 0),
                  y: e.clientY - (bounds.top ?? 0),
                },
              })
              .pipe(Effect.runPromise);
          });

          createEffect(() => {
            console.log(JSON.stringify(presence.clients, null, 2));
            console.log("realtime id", realtime.id());
            console.log("graph id", graph.id);
          });

          return (
            <GraphContextProvider bounds={bounds}>
              <Graph
                ref={setRef}
                nodes={graph.nodes}
                getSchema={(ref) =>
                  Option.fromNullable(
                    state.packages[ref.pkgId]?.schemas[ref.schemaId],
                  )
                }
                selection={
                  selection.graphId === graph.id ? selection.items : new Set()
                }
                remoteSelections={Object.entries(presence.clients).flatMap(
                  ([userId, data]) => {
                    if (Number(userId) === realtime.id()) return [];

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
                  setSelection(reconcile({ graphId: graph.id, items }));
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
                  actions.DeleteSelection(graph.id, [...selection.items]);
                }}
              />
              <For each={Object.entries(presence.clients)}>
                {(item) => (
                  <>
                    <Show
                      when={
                        Number(item[0]) !== realtime.id() &&
                        item[1].mouse?.graph === graph.id &&
                        item[1].mouse
                      }
                    >
                      {(mouse) => (
                        <>
                          <PresencePointer
                            style={{
                              transform: `translate(${mouse().x + (bounds.left ?? 0)}px, ${mouse().y + (bounds.top ?? 0)}px)`,
                            }}
                            name={item[1].name}
                            colour={item[1].colour}
                          />
                        </>
                      )}
                    </Show>
                  </>
                )}
              </For>

              <GraphContextMenu
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
          );
        }}
      </Show>
    </div>
  );
}
