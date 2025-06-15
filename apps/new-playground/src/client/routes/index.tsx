import * as Effect from "effect/Effect";
import { createSignal, For, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { createEventListener } from "@solid-primitives/event-listener";
import { createElementBounds } from "@solid-primitives/bounds";
import { createEffect } from "solid-js";
import { createMousePosition } from "@solid-primitives/mouse";

export default function () {
  const graph = () => data.graphs["0"];

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
        actions.DeleteSelection(selection.graphId, [...selection.items]);
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

          return (
            <GraphContextProvider bounds={bounds}>
              <Graph
                ref={setRef}
                nodes={graph.nodes}
                packages={data.packages}
                selection={
                  selection.graphId === graph.id ? selection.items : new Set()
                }
                remoteSelections={Object.entries(presenceClients).flatMap(
                  ([userId, data]) => {
                    if (Number(userId) === realtimeId) return [];

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
              <For each={Object.entries(presenceClients)}>
                {(item) => (
                  <Show
                    when={
                      Number(item[0]) !== realtimeId &&
                      item[1].mouse?.graph === graph.id &&
                      item[1].mouse
                    }
                  >
                    {(mouse) => (
                      <PresencePointer
                        style={{
                          transform: `translate(${mouse().x + (bounds.left ?? 0)}px, ${mouse().y + (bounds.top ?? 0)}px)`,
                        }}
                        name={item[1].name}
                        colour={item[1].colour}
                      />
                    )}
                  </Show>
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
