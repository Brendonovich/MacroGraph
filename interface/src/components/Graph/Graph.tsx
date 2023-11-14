import clsx from "clsx";
import {
  Accessor,
  createContext,
  useContext,
  createRoot,
  createEffect,
} from "solid-js";
import {
  Graph as GraphModel,
  Pin,
  XY,
  Node as NodeModel,
  CommentBox as CommentBoxModel,
} from "@macrograph/core";
import { createSignal, For, onMount } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import { createEventListener } from "@solid-primitives/event-listener";

import { Node } from "./Node";
import { ConnectionRender } from "../Graph";
import { useUIStore } from "../../UIStore";
import { CommentBox } from "./CommentBox";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { SetStoreFunction, createStore } from "solid-js/store";
import { useCoreContext } from "../../contexts";
import { createElementBounds } from "@solid-primitives/bounds";
import { GraphList } from "../ProjectSidebar";

type PanState =
  | { state: "none" }
  | { state: "waiting"; downposx: number; downposy: number }
  | { state: "active" };

interface Props {
  graph: GraphModel;
}

function createGraphState(
  model: GraphModel,
  ref: Accessor<HTMLDivElement | undefined>
) {
  const bounds = createElementBounds(ref);

  const [state, setState] = createStore({
    model,
    bounds,
    offset: {
      get x() {
        return bounds.left;
      },
      get y() {
        return bounds.top;
      },
    } as XY,
    translate: {
      x: 0,
      y: 0,
    } as XY,
    scale: 1,
    selectedItem: null as NodeModel | CommentBoxModel | null,
  });

  return [state, setState] as const;
}

export type GraphState = ReturnType<typeof createGraphState>[0];

export function toGraphSpace(clientXY: XY, state: GraphState) {
  return {
    x: (clientXY.x - state.offset.x) / state.scale + state.translate.x,
    y: (clientXY.y - state.offset.y) / state.scale + state.translate.y,
  };
}

export function toScreenSpace(graphXY: XY, state: GraphState) {
  return {
    x: (graphXY.x - state.translate.x) * state.scale + state.offset.x,
    y: (graphXY.y - state.translate.y) * state.scale + state.offset.y,
  };
}

const MAX_ZOOM_IN = 2.5;
const MAX_ZOOM_OUT = 5;

export const Graph = (props: Props) => {
  const coreCtx = useCoreContext();

  const model = () => props.graph;

  const UI = useUIStore();

  const [ref, setRef] = createSignal<HTMLDivElement | undefined>();

  const [state, setState] = createGraphState(props.graph, ref);
  const pinPositions = new ReactiveWeakMap<Pin, XY>();

  function onResize() {
    const bounds = ref()!.getBoundingClientRect()!;

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

  createEffect(() => {
    setState({
      model: model(),
    });
    UI.registerGraphState(props.graph, state);
  });

  onMount(() => {
    createEventListener(window, "resize", onResize);
    createResizeObserver(ref, onResize);

    createEventListener(ref, "gesturestart", () => {
      let lastScale = 1;

      createRoot((dispose) => {
        createEventListener(ref, "gestureend", dispose);

        createEventListener(ref, "gesturechange", (e: any) => {
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
        ref={setRef}
      >
        <ConnectionRender />
        <div
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
                    UI.state.schemaMenu = {
                      status: "open",
                      graph: state,
                      position: {
                        x: e.clientX,
                        y: e.clientY,
                      },
                    };
                }

                setPan({ state: "none" });
                break;
            }
          }}
          onMouseDown={(e) => {
            switch (e.button) {
              case 0:
                setState({ selectedItem: null });
                UI.state.schemaMenu = { status: "closed" };
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

                    UI.state.schemaMenu = {
                      status: "closed",
                    };

                    setState({
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
          onMouseEnter={() => (UI.state.hoveredGraph = props.graph)}
          onMouseMove={() => (UI.state.hoveredGraph = props.graph)}
          onMouseLeave={() => (UI.state.hoveredGraph = null)}
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
