import "@total-typescript/ts-reset";
import * as Solid from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
  CommentBox,
  Core,
  SerializedProject,
  XY,
  Node,
  Graph as GraphModel,
  Node as NodeModel,
  Project,
  Size,
  deserializeConnections,
} from "@macrograph/runtime";
import {
  createEventListener,
  createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createElementBounds } from "@solid-primitives/bounds";
import { createMousePosition } from "@solid-primitives/mouse";
import { makePersisted } from "@solid-primitives/storage";
import HeroiconsXMarkSolid from "~icons/heroicons/x-mark-solid";
import clsx from "clsx";

import { CoreProvider } from "./contexts";
import {
  Graph,
  GraphState,
  createGraphState,
  toGraphSpace,
} from "./components/Graph";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { SchemaMenu } from "./components/SchemaMenu";
import { MIN_WIDTH, Sidebar } from "./components/Sidebar";
import Settings from "./settings";
import { GraphList } from "./components/ProjectSidebar";
import { PrintOutput } from "./components/PrintOutput";
import { GraphSidebar, NodeSidebar } from "./Sidebars";
import {
  commentBoxToClipboardItem,
  deserializeClipboardItem,
  nodeToClipboardItem,
  readFromClipboard,
  writeClipboardItemToClipboard,
} from "./clipboard";
import { CustomEventList } from "./components/CustomEvents";
import "./global.css";

export { useCore } from "./contexts";

export type GraphBounds = XY & {
  width: number;
  height: number;
};

type SchemaMenuState =
  | { status: "closed" }
  | { status: "open"; position: XY; graph: GraphState };

export function Interface(props: {
  core: Core;
  environment: "custom" | "browser";
}) {
  const UI = createUIStore();

  const [rootRef, setRootRef] = Solid.createSignal<
    HTMLDivElement | undefined
  >();
  const rootBounds = createElementBounds(rootRef);

  const mouse = createMousePosition(window);

  const leftSidebar = createSidebarState("left-sidebar");
  const rightSidebar = createSidebarState("right-sidebar");

  const [graphBounds, setGraphBounds] = createStore<GraphBounds>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [graphStates, setGraphStates] = makePersisted(
    createStore<GraphState[]>([]),
    { name: "graph-states" }
  );
  const [currentGraphIndex, setCurrentGraphIndex] = makePersisted(
    Solid.createSignal<number>(0),
    { name: "current-graph-index" }
  );

  const [schemaMenu, setSchemaMenu] = Solid.createSignal<SchemaMenuState>({
    status: "closed",
  });

  const nodeSizes = new WeakMap<NodeModel, Size>();

  const currentGraph = Solid.createMemo(() => {
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

  // will account for multi-pane in future
  const [hoveredPane, setHoveredPane] = Solid.createSignal<null | true>(null);

  const hoveredGraph = Solid.createMemo(() => {
    if (hoveredPane()) return currentGraph();
  });

  const [loadedProject] = Solid.createResource(async () => {
    const savedProject = localStorage.getItem("project");

    if (savedProject) {
      await props.core.load(SerializedProject.parse(JSON.parse(savedProject)));

      return props.core.project;
    } else return null;
  });

  Solid.createEffect(() => {
    const project = loadedProject();

    if (project) {
      const firstGraph = project.graphs.values().next().value;
      if (graphStates.length === 0 && firstGraph)
        setGraphStates([createGraphState(firstGraph)]);
    } else if (loadedProject.state === "pending") return;

    // reduces the current graph index if the current graph
    // is the end graph and it gets deleted
    Solid.createEffect(() => {
      if (currentGraph()) return;
      setCurrentGraphIndex(Math.max(0, currentGraphIndex() - 1));
    });

    // removes graph states if graphs are deleted
    Solid.createEffect(() => {
      for (const state of graphStates) {
        const graph = props.core.project.graphs.get(state.id);
        if (!graph)
          setGraphStates(graphStates.filter((s) => s.id !== state.id));
      }
    });
  });

  createEventListener(window, "keydown", async (e) => {
    const { core } = props;
    const { project } = core;

    switch (e.code) {
      case "KeyC": {
        if (!e.metaKey && !e.ctrlKey) return;
        const graph = currentGraph();
        const selectedItemId = graph?.state?.selectedItemId;
        if (!selectedItemId) return;

        if (selectedItemId.type === "node") {
          const node = graph.model.nodes.get(selectedItemId.id);
          if (!node) break;

          await writeClipboardItemToClipboard(nodeToClipboardItem(node));
        } else if (selectedItemId.type === "commentBox") {
          const box = graph.model.commentBoxes.get(selectedItemId.id);
          if (!box) break;

          await writeClipboardItemToClipboard(
            commentBoxToClipboardItem(box, (node) => nodeSizes.get(node))
          );
        }

        // TODO: toast

        break;
      }
      case "KeyV": {
        if (!e.metaKey && !e.ctrlKey) return;

        const item = deserializeClipboardItem(await readFromClipboard());

        switch (item.type) {
          case "node": {
            const graph = hoveredGraph();
            if (!graph) return;

            const { model, state } = graph;

            item.node.id = model.generateId();
            const node = Node.deserialize(model, {
              ...item.node,
              position: toGraphSpace(
                { x: mouse.x - 10, y: mouse.y - 10 },
                graphBounds,
                state
              ),
            });
            if (!node) throw new Error("Failed to deserialize node");

            model.nodes.set(item.node.id, node);

            break;
          }
          case "commentBox": {
            const graph = hoveredGraph();
            if (!graph) return;

            const { model, state } = graph;

            item.commentBox.id = model.generateId();
            const commentBox = CommentBox.deserialize(model, {
              ...item.commentBox,
              position: toGraphSpace(
                { x: mouse.x - 10, y: mouse.y - 10 },
                graphBounds,
                state
              ),
            });
            if (!commentBox)
              throw new Error("Failed to deserialize comment box");

            model.commentBoxes.set(item.commentBox.id, commentBox);

            const nodeIdMap = new Map<number, number>();

            Solid.batch(() => {
              for (const nodeJson of item.nodes) {
                const id = model.generateId();
                nodeIdMap.set(nodeJson.id, id);
                nodeJson.id = id;
                const node = Node.deserialize(model, {
                  ...nodeJson,
                  position: {
                    x:
                      commentBox.position.x +
                      nodeJson.position.x -
                      item.commentBox.position.x,
                    y:
                      commentBox.position.y +
                      nodeJson.position.y -
                      item.commentBox.position.y,
                  },
                });

                if (!node) throw new Error("Failed to deserialize node");

                model.nodes.set(node.id, node);
              }

              deserializeConnections(
                item.connections,
                model.connections,
                nodeIdMap
              );
            });

            break;
          }
          case "graph": {
            item.graph.id = project.generateGraphId();
            const graph = GraphModel.deserialize(project, item.graph);
            if (!graph) throw new Error("Failed to deserialize graph");
            core.project.graphs.set(graph.id, graph);
            break;
          }
          case "project": {
            const project = await Project.deserialize(core, item.project);
            if (!project) throw new Error("Failed to deserialize project");
            core.project = project;
            break;
          }
        }

        break;
      }
      case "KeyK": {
        if (!((e.metaKey || e.ctrlKey) && e.shiftKey)) return;

        const menuState = schemaMenu();

        if (
          menuState.status === "open" &&
          menuState.position.x === mouse.x &&
          menuState.position.y === mouse.y
        )
          setSchemaMenu({ status: "closed" });
        else {
          const graph = currentGraph();
          if (!graph) return;

          setSchemaMenu({
            status: "open",
            position: {
              x: mouse.x,
              y: mouse.y,
            },
            graph: graph.state,
          });
        }

        break;
      }
      case "KeyB": {
        if (!(e.metaKey || e.ctrlKey)) return;

        leftSidebar.setState((s) => ({ open: !s.open }));

        break;
      }
      case "KeyE": {
        if (!(e.metaKey || e.ctrlKey)) return;

        rightSidebar.setState((s) => ({ open: !s.open }));

        break;
      }
      case "ArrowLeft":
      case "ArrowRight": {
        if (
          props.environment === "browser" &&
          !(e.metaKey || (e.shiftKey && e.ctrlKey))
        )
          return;
        else if (
          props.environment === "custom" &&
          !(e.metaKey || (e.shiftKey && e.altKey))
        )
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
          class="relative w-full h-full flex flex-row select-none bg-neutral-800 text-white"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Solid.Show when={leftSidebar.state.open}>
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
                <CustomEventList />
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
          </Solid.Show>

          <div class="flex-1 flex divide-y divide-black flex-col h-full justify-center items-center text-white overflow-x-hidden">
            <Solid.Show when={currentGraph()} fallback="No graph selected">
              {(graph) => (
                <>
                  <div class="overflow-x-auto w-full scrollbar scrollbar-none">
                    <div class="h-8 flex flex-row divide-x divide-black">
                      <Solid.For
                        each={graphStates
                          .map((state) => {
                            const graph = props.core.project.graphs.get(
                              state.id
                            );
                            if (!graph) return;

                            return [state, graph] as const;
                          })
                          .filter(Boolean)}
                      >
                        {([_state, graph], index) => (
                          <button
                            class={clsx(
                              "p-2 flex flex-row items-center relative group shrink-0 whitespace-nowrap",
                              currentGraphIndex() === index() && "bg-white/20"
                            )}
                            onClick={() => setCurrentGraphIndex(index)}
                          >
                            {graph.name}
                            <HeroiconsXMarkSolid
                              class="hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 ml-2 p-0.5"
                              stroke-width={1}
                              onClick={(e) => {
                                e.stopPropagation();

                                setGraphStates(
                                  produce((states) => {
                                    states.splice(index(), 1);
                                    return states;
                                  })
                                );
                              }}
                            />
                          </button>
                        )}
                      </Solid.For>
                      <div class="flex-1" />
                    </div>
                  </div>
                  <Graph
                    graph={graph().model}
                    state={graph().state}
                    nodeSizes={nodeSizes}
                    onMouseEnter={() => setHoveredPane(true)}
                    onMouseMove={() => setHoveredPane(true)}
                    onMouseLeave={() => setHoveredPane(null)}
                    onMouseUp={(e) => {
                      if (e.button === 2)
                        setSchemaMenu({
                          status: "open",
                          graph: graph().state,
                          position: {
                            x: e.clientX,
                            y: e.clientY,
                          },
                        });
                    }}
                    onGraphDragStart={() => {
                      setSchemaMenu({ status: "closed" });
                    }}
                    onItemSelected={(id) => {
                      setGraphStates(graph().index, { selectedItemId: id });
                    }}
                    onBoundsChange={setGraphBounds}
                    onSizeChange={setGraphBounds}
                    onScaleChange={(scale) => {
                      setGraphStates(graph().index, {
                        scale,
                      });
                    }}
                    onTranslateChange={(translate) => {
                      setGraphStates(
                        produce((states) => {
                          states[graph().index]!.translate = translate;
                          return states;
                        })
                      );
                    }}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        Solid.batch(() => {
                          setGraphStates(graph().index, {
                            selectedItemId: null,
                          });
                          setSchemaMenu({ status: "closed" });
                        });
                      }
                    }}
                  />
                </>
              )}
            </Solid.Show>
          </div>

          <Solid.Show when={rightSidebar.state.open}>
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
              <Solid.Show when={currentGraph()}>
                {(graph) => (
                  <Solid.Switch
                    fallback={<GraphSidebar graph={graph().model} />}
                  >
                    <Solid.Match
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
                    </Solid.Match>
                  </Solid.Switch>
                )}
              </Solid.Show>
            </Sidebar>
          </Solid.Show>

          <Solid.Show
            when={(() => {
              const state = schemaMenu();
              return state.status === "open" && state;
            })()}
          >
            {(data) => {
              const graph = Solid.createMemo(() => {
                return props.core.project.graphs.get(data().graph.id);
              });

              Solid.createEffect(() => {
                if (!graph()) setSchemaMenu({ status: "closed" });
              });

              const graphPosition = () =>
                toGraphSpace(data().position, graphBounds, data().graph);

              return (
                <Solid.Show when={graph()}>
                  {(graph) => (
                    <SchemaMenu
                      graph={data().graph}
                      position={{
                        x: data().position.x - (rootBounds?.left ?? 0),
                        y: data().position.y - (rootBounds?.top ?? 0),
                      }}
                      onCreateCommentBox={() => {
                        Solid.batch(() => {
                          graph().createCommentBox({
                            position: graphPosition(),
                            size: { x: 400, y: 200 },
                            text: "Comment",
                          });

                          setSchemaMenu({ status: "closed" });
                        });
                      }}
                      onSchemaClicked={(schema) => {
                        Solid.batch(() => {
                          graph().createNode({
                            schema,
                            position: graphPosition(),
                          });

                          setSchemaMenu({ status: "closed" });
                        });
                      }}
                    />
                  )}
                </Solid.Show>
              );
            }}
          </Solid.Show>
        </div>
      </UIStoreProvider>
    </CoreProvider>
  );
}

function createSidebarState(name: string) {
  const [state, setState] = makePersisted(
    createStore({
      width: MIN_WIDTH,
      open: true,
    }),
    { name }
  );

  // Solid.createEffect(
  //   Solid.on(
  //     () => state.width,
  //     (width) => {
  //       if (width < MIN_WIDTH * (1 - SNAP_CLOSE_PCT)) setState({ open: false });
  //       else if (width > MIN_WIDTH * (1 - SNAP_CLOSE_PCT))
  //         setState({ open: true });
  //     }
  //   )
  // );

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

          Solid.createRoot((dispose) => {
            let currentWidth = startWidth;

            Solid.onCleanup(() => props.onResizeEnd?.(currentWidth));

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
