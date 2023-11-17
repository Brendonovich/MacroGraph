import {
  createSignal,
  onMount,
  Show,
  createMemo,
  Switch,
  Match,
  createEffect,
  createRoot,
  For,
  onCleanup,
  on,
} from "solid-js";
import { Core, SerializedProject, XY } from "@macrograph/core";
import {
  createEventListener,
  createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createElementBounds } from "@solid-primitives/bounds";
import { createMousePosition } from "@solid-primitives/mouse";
import { makePersisted } from "@solid-primitives/storage";
import { HiSolidXMark } from "solid-icons/hi";

import { CoreProvider } from "./contexts";
import {
  Graph,
  GraphState,
  createGraphState,
  toGraphSpace,
} from "./components/Graph";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { SchemaMenu } from "./components/SchemaMenu";
import { createStore, produce } from "solid-js/store";
import { MIN_WIDTH, SNAP_CLOSE_PCT, Sidebar } from "./components/Sidebar";
import Settings from "./settings";
import { GraphList } from "./components/ProjectSidebar";
import { PrintOutput } from "./components/PrintOutput";
import { GraphSidebar, NodeSidebar } from "./Sidebars";
import clsx from "clsx";
import { FaSolidX } from "solid-icons/fa";

export { useCore } from "./contexts";

export type GraphBounds = XY & {
  width: number;
  height: number;
};

export function Interface(props: {
  core: Core;
  environment: "custom" | "browser";
}) {
  const UI = createUIStore(props.core);

  const [rootRef, setRootRef] = createSignal<HTMLDivElement | undefined>();
  const rootBounds = createElementBounds(rootRef);

  const mouse = createMousePosition(window);

  const leftSidebar = makeSidebarState("left-sidebar");
  const rightSidebar = makeSidebarState("right-sidebar");

  const [graphBounds, setGraphBounds] = createStore<GraphBounds>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [graphStates, setGraphStates] = createStore<GraphState[]>([]);
  const [currentGraphIndex, setCurrentGraphIndex] = createSignal<number>(0);

  const currentGraph = createMemo(() => {
    const index = currentGraphIndex();
    if (index === null) return;

    const state = graphStates[index];
    if (!state) return;

    const model = props.core.project.graphs.get(state.id);
    if (!model) return;

    return {
      model,
      state,
      index,
    };
  });

  onMount(async () => {
    const savedProject = localStorage.getItem("project");
    if (savedProject)
      await props.core.load(SerializedProject.parse(JSON.parse(savedProject)));

    const firstGraph = props.core.project.graphs.values().next();
    if (firstGraph.value) setGraphStates([createGraphState(firstGraph.value)]);
  });

  createEventListener(window, "keydown", (e) => {
    switch (e.code) {
      case "KeyC": {
        if (!e.metaKey && !e.ctrlKey) return;
        const graph = currentGraph();
        if (!graph || !graph.state.selectedItemId) return;

        // UI.copyItem(graph.state.selectedItemId);

        break;
      }
      case "KeyV": {
        if (!e.metaKey && !e.ctrlKey) return;

        // UI.pasteClipboard();

        break;
      }
      case "KeyK": {
        if (!((e.metaKey || e.ctrlKey) && e.shiftKey)) return;

        if (
          UI.state.schemaMenu.status === "open" &&
          UI.state.schemaMenu.position.x === mouse.x &&
          UI.state.schemaMenu.position.y === mouse.y
        )
          UI.state.schemaMenu = { status: "closed" };
        else {
          const graph = currentGraph();
          if (!graph) return;

          UI.state.schemaMenu = {
            status: "open",
            position: {
              x: mouse.x,
              y: mouse.y,
            },
            graph: graph.state,
          };
        }

        break;
      }
      case "KeyB": {
        if (!(e.metaKey || e.ctrlKey)) return;

        leftSidebar.setState((s) => ({ open: !s.open }));

        break;
      }
      case "KeyR": {
        if (!(e.metaKey || e.ctrlKey)) return;

        rightSidebar.setState((s) => ({ open: !s.open }));

        break;
      }
      case "ArrowLeft":
      case "ArrowRight": {
        if (props.environment === "browser" && !(e.metaKey && e.ctrlKey))
          return;
        else if (props.environment === "custom" && !(e.metaKey && e.altKey))
          return;

        if (e.code === "ArrowLeft")
          setCurrentGraphIndex((i) => Math.max(i - 1, 0));
        else
          setCurrentGraphIndex((i) => Math.min(i + 1, graphStates.length - 1));
      }
      default: {
        return;
      }
    }

    e.stopPropagation();
    e.preventDefault();
  });

  return (
    <CoreProvider core={props.core} rootRef={rootRef}>
      <UIStoreProvider store={UI}>
        <div
          ref={setRootRef}
          class="relative w-full h-full flex flex-row overflow-hidden select-none bg-neutral-800"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Show when={leftSidebar.state.open}>
            <Sidebar width={Math.max(leftSidebar.state.width, MIN_WIDTH)}>
              <Settings />
              <div class="overflow-y-auto outer-scroll flex-1">
                <GraphList
                  currentGraph={currentGraph()?.model.id}
                  onGraphClicked={(graph) => {
                    const currentIndex = graphStates.findIndex(
                      (s) => s.id === graph.id
                    );

                    if (currentIndex === -1) {
                      setGraphStates((s) => [...s, createGraphState(graph)]);
                      setCurrentGraphIndex(graphStates.length - 1);
                    } else setCurrentGraphIndex(currentIndex);
                  }}
                />
                <PrintOutput />
              </div>
            </Sidebar>

            <ResizeHandle
              width={leftSidebar.state.width}
              side="right"
              onResize={(width) => leftSidebar.setState({ width })}
              onResizeEnd={(width) =>
                leftSidebar.state.open &&
                width < MIN_WIDTH &&
                leftSidebar.setState({ width: MIN_WIDTH })
              }
            />
          </Show>

          <div class="flex-1 flex divide-y divide-black flex-col h-full justify-center items-center text-white">
            <Show when={graphStates.length > 0} fallback="No graph selected">
              <div class="h-8 w-full flex flex-row divide-x divide-black">
                <For each={graphStates}>
                  {(state, index) => {
                    const graph = createMemo(() => {
                      return props.core.project.graphs.get(state.id);
                    });

                    createEffect(() => {
                      if (!graph())
                        setGraphStates(
                          produce((s) => {
                            s.splice(index(), 1);
                          })
                        );
                    });

                    return (
                      <Show when={graph()}>
                        {(graph) => (
                          <button
                            class={clsx(
                              "p-2 flex flex-row items-center relative group",
                              currentGraphIndex() === index() && "bg-white/20"
                            )}
                            onClick={() => setCurrentGraphIndex(index)}
                          >
                            {graph().name}
                            <HiSolidXMark
                              class="hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 ml-2 p-0.5"
                              size={20}
                              stroke-width={1}
                              onClick={(e) => {
                                e.stopPropagation();

                                setGraphStates(
                                  produce((states) => {
                                    states.splice(index(), 1);
                                    return states;
                                  })
                                );

                                setCurrentGraphIndex(
                                  Math.min(
                                    currentGraphIndex(),
                                    graphStates.length - 1
                                  )
                                );
                              }}
                            />
                          </button>
                        )}
                      </Show>
                    );
                  }}
                </For>
              </div>
              <Show when={currentGraph()}>
                {(graph) => (
                  <Graph
                    graph={graph().model}
                    state={graph().state}
                    onItemSelected={(id) => {
                      setGraphStates(graph().index, { selectedItemId: id });
                    }}
                    onBoundsChange={(bounds) => {
                      setGraphBounds(bounds);
                    }}
                    onSizeChange={(size) => {
                      setGraphBounds(size);
                    }}
                    onScaleChange={(scale) => {
                      setGraphStates(graph().index, {
                        scale,
                      });
                    }}
                    onTranslateChange={(translate) => {
                      setGraphStates(graph().index, {
                        translate,
                      });
                    }}
                    onMouseDown={() => {
                      setGraphStates(graph().index, {
                        selectedItemId: null,
                      });
                    }}
                  />
                )}
              </Show>
            </Show>
          </div>

          <Show when={rightSidebar.state.open}>
            <ResizeHandle
              width={rightSidebar.state.width}
              side="left"
              onResize={(width) => rightSidebar.setState({ width })}
              onResizeEnd={(width) =>
                rightSidebar.state.open &&
                width < MIN_WIDTH &&
                rightSidebar.setState({ width: MIN_WIDTH })
              }
            />
            <Sidebar width={Math.max(rightSidebar.state.width, MIN_WIDTH)}>
              <Show when={currentGraph()}>
                {(graph) => (
                  <Switch fallback={<GraphSidebar graph={graph().model} />}>
                    <Match
                      when={(() => {
                        const {
                          model,
                          state: { selectedItemId },
                        } = graph();

                        if (!selectedItemId || selectedItemId.type !== "node")
                          return;

                        return model.nodes.get(selectedItemId.id);
                      })()}
                    >
                      {(node) => <NodeSidebar node={node()} />}
                    </Match>
                  </Switch>
                )}
              </Show>
            </Sidebar>
          </Show>

          <Show
            when={UI.state.schemaMenu.status === "open" && UI.state.schemaMenu}
          >
            {(data) => {
              const graph = createMemo(() => {
                return props.core.project.graphs.get(data().graph.id);
              });

              createEffect(() => {
                if (!graph()) UI.state.schemaMenu = { status: "closed" };
              });

              const graphPosition = () =>
                toGraphSpace(data().position, graphBounds, data().graph);

              return (
                <Show when={graph()}>
                  {(graph) => (
                    <SchemaMenu
                      graph={data().graph}
                      position={{
                        x: data().position.x - (rootBounds?.left ?? 0),
                        y: data().position.y - (rootBounds?.top ?? 0),
                      }}
                      onCreateCommentBox={() => {
                        graph().createCommentBox({
                          position: graphPosition(),
                          size: { x: 400, y: 200 },
                          text: "Comment",
                        });

                        UI.state.schemaMenu = { status: "closed" };
                      }}
                      onSchemaClicked={(schema) => {
                        graph().createNode({
                          schema,
                          position: graphPosition(),
                        });

                        UI.state.schemaMenu = { status: "closed" };
                      }}
                    />
                  )}
                </Show>
              );
            }}
          </Show>
        </div>
      </UIStoreProvider>
    </CoreProvider>
  );
}

function makeSidebarState(name: string) {
  const [state, setState] = makePersisted(
    createStore({
      width: MIN_WIDTH,
      open: true,
    }),
    { name }
  );

  createEffect(
    on(
      () => state.width,
      (width) => {
        if (width < MIN_WIDTH * (1 - SNAP_CLOSE_PCT)) setState({ open: false });
        else if (width > MIN_WIDTH * (1 - SNAP_CLOSE_PCT))
          setState({ open: true });
      }
    )
  );

  return { state, setState };
}

function ResizeHandle(props: {
  width: number;
  side: "left" | "right";
  onResize?(width: number): void;
  onResizeEnd?(width: number): void;
}) {
  return (
    <div class="relative w-px">
      <div
        class="cursor-ew-resize absolute inset-y-0 -inset-x-1 z-10"
        onMouseDown={(e) => {
          e.stopPropagation();

          if (e.button !== 0) return;

          const startX = e.clientX;
          const startWidth = props.width;

          createRoot((dispose) => {
            let currentWidth = startWidth;

            onCleanup(() => props.onResizeEnd?.(currentWidth));

            createEventListenerMap(window, {
              mouseup: dispose,
              mousemove: (e) => {
                props.onResize?.(
                  (currentWidth =
                    startWidth +
                    (e.clientX - startX) * (props.side === "right" ? 1 : -1))
                );
              },
            });
          });
        }}
      />
    </div>
  );
}
