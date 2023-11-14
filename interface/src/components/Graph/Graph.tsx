import clsx from "clsx";
import { Accessor, createContext, useContext, createRoot } from "solid-js";
import {
  Graph as GraphModel,
  Pin,
  XY,
  Node as NodeModel,
  CommentBox as CommentBoxModel,
} from "@macrograph/core";
import { createSignal, For, onMount, Show } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";

import { Node } from "./Node";
import { ConnectionRender, SchemaMenu } from "../Graph";
import { useUIStore } from "../../UIStore";
import { CommentBox } from "./CommentBox";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { SetStoreFunction, createStore } from "solid-js/store";

type PanState =
  | { state: "none" }
  | { state: "waiting"; downposx: number; downposy: number }
  | { state: "active" };

interface Props {
  graph: GraphModel;
}

function createGraphState() {
  return createStore({
    offset: {
      x: 0,
      y: 0,
    } as XY,
    translate: {
      x: 0,
      y: 0,
    } as XY,
    scale: 1,
    schemaMenu: {
      status: "closed",
    } as { status: "closed" } | { status: "open"; position: XY },
    selectedItem: null as NodeModel | CommentBoxModel | null,
  });
}

export type GraphState = ReturnType<typeof createGraphState>[0];

export function toGraphSpace(clientXY: XY, state: GraphState) {
  return {
    x: (clientXY.x - state.offset.x) / state.scale,
    y: (clientXY.y - state.offset.y) / state.scale,
  };
}

export function toScreenSpace(graphXY: XY, state: GraphState) {
  return {
    x: graphXY.x * state.scale + state.offset.x,
    y: graphXY.y * state.scale + state.offset.y,
  };
}

const MAX_ZOOM_IN = 2.5;
const MAX_ZOOM_OUT = 5;

export const Graph = (props: Props) => {
  const model = () => props.graph;

  const UI = useUIStore();

  let graphRef: HTMLDivElement;

  const [state, setState] = createGraphState();
  const pinPositions = new ReactiveWeakMap<Pin, XY>();

  function onResize() {
    const bounds = graphRef.getBoundingClientRect()!;

    setState({
      offset: {
        x: bounds.left,
        y: bounds.top,
      },
    });
  }

  function updateScale(delta: number, screenOrigin: XY) {
    const startGraphOrigin = toGraphSpace(screenOrigin, state);

    setState({
      scale: Math.min(
        Math.max(1 / MAX_ZOOM_OUT, state.scale + delta / 20),
        MAX_ZOOM_IN
      ),
    });

    const endGraphOrigin = toScreenSpace(startGraphOrigin, state);

    setState({
      translate: {
        x:
          state.translate.x + (endGraphOrigin.x - screenOrigin.x) / state.scale,
        y:
          state.translate.y + (endGraphOrigin.y - screenOrigin.y) / state.scale,
      },
    });
  }

  onMount(() => {
    UI.registerGraphState(props.graph, state);

    createEventListener(window, "resize", onResize);
    createResizeObserver(graphRef, onResize);

    createEventListener(graphRef, "gesturestart", () => {
      let lastScale = 1;

      createRoot((dispose) => {
        createEventListener(graphRef, "gestureend", dispose);

        createEventListener(graphRef, "gesturechange", (e: any) => {
          let scale = e.scale;
          let direction = 1;

          if (scale < 1) {
            direction = -1;
            scale = 1 / scale;
            if (lastScale < 1) lastScale = 1 / lastScale;
          }

          updateScale((scale - lastScale) * direction, {
            x: e.clientX,
            y: e.clientY,
          });

          lastScale = e.scale;
        });
      });
    });
  });

  const [pan, setPan] = createSignal<PanState>({ state: "none" });

  const mouse = createMousePosition(window);

  createEventListener(window, "keydown", (e) => {
    if (e.code === "KeyK" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();

      const position = toGraphSpace(mouse, state);

      if (
        state.schemaMenu.status === "open" &&
        state.schemaMenu.position.x === position.x &&
        state.schemaMenu.position.y === position.y
      )
        setState({ schemaMenu: { status: "closed" } });
      else
        setState({
          schemaMenu: { status: "open", position },
        });
    }
  });

  return (
    <GraphContext.Provider
      value={{
        model,
        state,
        setState,
        pinPositions,
        toGraphSpace: (xy) => toGraphSpace(xy, state),
        toScreenSpace: (xy) => toScreenSpace(xy, state),
      }}
    >
      <div
        onMouseDown={() => UI.setFocusedGraph(props.graph)}
        class="flex-1 relative h-full overflow-hidden bg-mg-graph"
      >
        <Show when={state.schemaMenu.status === "open" && state.schemaMenu}>
          {(data) => (
            <SchemaMenu
              position={data().position}
              onSchemaClicked={(s) => {
                model().createNode({
                  schema: s,
                  position: data().position,
                });
                setState({ schemaMenu: { status: "closed" } });
              }}
            />
          )}
        </Show>
        <ConnectionRender />
        <div
          ref={graphRef!}
          class={clsx(
            "absolute inset-0 text-white origin-top-left overflow-hidden w-[500%] h-[500%]",
            pan().state === "active" && "cursor-grabbing"
          )}
          style={{ transform: `scale(${state.scale})` }}
          onWheel={(e) => {
            e.preventDefault();

            let deltaX = e.deltaX,
              deltaY = e.deltaY,
              isTouchpad = false;

            if (Math.abs((e as any).wheelDeltaY) === Math.abs(e.deltaY) * 3) {
              deltaX = -(e as any).wheelDeltaX / 3;
              deltaY = -(e as any).wheelDeltaY / 3;
              isTouchpad = true;
            }

            if (e.ctrlKey) {
              const delta = ((isTouchpad ? 1 : -1) * deltaY) / 100;

              updateScale(delta, {
                x: e.clientX,
                y: e.clientY,
              });
            } else
              setState({
                translate: {
                  x: state.translate.x + deltaX,
                  y: state.translate.y + deltaY,
                },
              });
          }}
          onMouseUp={(e) => {
            switch (e.button) {
              case 2:
                if (pan().state === "waiting") {
                  if (UI.state.mouseDragLocation) UI.setMouseDragLocation();
                  else
                    setState({
                      schemaMenu: {
                        status: "open",
                        position: toGraphSpace(
                          { x: e.clientX, y: e.clientY },
                          state
                        ),
                      },
                    });
                }

                setPan({ state: "none" });
                break;
            }
          }}
          onMouseDown={(e) => {
            switch (e.button) {
              case 0:
                setState({
                  schemaMenu: { status: "closed" },
                  selectedItem: null,
                });
                break;
              case 2:
                setPan({
                  state: "waiting",
                  downposx: e.clientX,
                  downposy: e.clientY,
                });

                const oldTranslate = { ...state.translate };
                const startPosition = {
                  x: e.clientX,
                  y: e.clientY,
                };

                createRoot((dispose) => {
                  createEventListener(window, "mousemove", (e) => {
                    const MOVE_BUFFER = 3;

                    if (
                      Math.abs(startPosition.x - e.clientX) < MOVE_BUFFER &&
                      Math.abs(startPosition.x - e.clientY) < MOVE_BUFFER
                    )
                      return;

                    setPan({ state: "active" });

                    setState({
                      schemaMenu: {
                        status: "closed",
                      },
                      translate: {
                        x:
                          (startPosition.x -
                            e.clientX +
                            oldTranslate.x * state.scale) /
                          state.scale,
                        y:
                          (startPosition.y -
                            e.clientY +
                            oldTranslate.y * state.scale) /
                          state.scale,
                      },
                    });
                  });

                  createEventListener(window, "mouseup", dispose);
                });

                break;
            }
          }}
          // onMouseMove={(e) => {
          //   const MOVE_BUFFER = 3;
          //   const panData = pan();

          //   if (panData.state === "none") return;
          //   if (
          //     panData.state === "waiting" &&
          //     Math.abs(panData.downposx - e.clientX) < MOVE_BUFFER &&
          //     Math.abs(panData.downposy - e.clientY) < MOVE_BUFFER
          //   )
          //     return;

          //   setPan({ state: "active" });

          //   setState({
          //     schemaMenu: {
          //       status: "closed",
          //     },
          //     translate: {
          //       x:
          //         (UI.state.mouseDownLocation!.x -
          //           e.clientX +
          //           UI.state.mouseDownTranslate!.x * state.scale) /
          //         state.scale,
          //       y:
          //         (UI.state.mouseDownLocation!.y -
          //           e.clientY +
          //           UI.state.mouseDownTranslate!.y * state.scale) /
          //         state.scale,
          //     },
          //   });
          // }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            class="origin-[0,0]"
            style={{
              transform: `translate(${state.translate.x * -1}px, ${
                state.translate.y * -1
              }px)`,
            }}
          >
            <For each={[...model().commentBoxes.values()]}>
              {(box) => <CommentBox box={box} />}
            </For>
            <For each={[...model().nodes.values()]}>
              {(node) => <Node node={node} />}
            </For>
          </div>
        </div>
      </div>
    </GraphContext.Provider>
  );
};

const GraphContext = createContext<{
  model: Accessor<GraphModel>;
  pinPositions: ReactiveWeakMap<Pin, XY>;
  state: GraphState;
  setState: SetStoreFunction<GraphState>;
  toGraphSpace(pos: XY): XY;
  toScreenSpace(pos: XY): XY;
} | null>(null);

export const useGraph = () => {
  const ctx = useContext(GraphContext);

  if (!ctx) throw new Error("CurrentGraphContext is missing!");

  return ctx.model;
};

export const useGraphContext = () => {
  const ctx = useContext(GraphContext);

  if (!ctx) throw new Error("CurrentGraphContext is missing!");

  return ctx;
};
