import clsx from "clsx";
import { Accessor, createContext, useContext, createRoot } from "solid-js";
import {
  Graph as GraphModel,
  Pin,
  XY,
  Node as NodeModel,
  Size,
} from "@macrograph/core";
import { createSignal, For, onMount } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import {
  createEventListener,
  createEventListenerMap,
} from "@solid-primitives/event-listener";

import { Node } from "./Node";
import { ConnectionRender } from "../Graph";
import { useUIStore } from "../../UIStore";
import { CommentBox } from "./CommentBox";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { createStore } from "solid-js/store";
import { ComponentProps } from "solid-js";

type PanState =
  | { state: "none" }
  | { state: "waiting"; downposx: number; downposy: number }
  | { state: "active" };

export type SelectedItemID =
  | { type: "node"; id: number }
  | { type: "commentBox"; id: number };

export function createGraphState(model: GraphModel) {
  return {
    id: model.id,
    translate: {
      x: 0,
      y: 0,
    } as XY,
    scale: 1,
    nodeSizes: new WeakMap<NodeModel, Size>(),
    selectedItemId: null as SelectedItemID | null,
  };
}

export type GraphState = ReturnType<typeof createGraphState>;

export function toGraphSpace(clientXY: XY, bounds: XY, state: GraphState) {
  return {
    x: (clientXY.x - bounds.x) / state.scale + state.translate.x,
    y: (clientXY.y - bounds.y) / state.scale + state.translate.y,
  };
}

export function toScreenSpace(graphXY: XY, bounds: XY, state: GraphState) {
  return {
    x: (graphXY.x - state.translate.x) * state.scale + bounds.x,
    y: (graphXY.y - state.translate.y) * state.scale + bounds.y,
  };
}

const MAX_ZOOM_IN = 2.5;
const MAX_ZOOM_OUT = 5;

interface Props extends ComponentProps<"div"> {
  state: GraphState;
  graph: GraphModel;
  onScaleChange(scale: number): void;
  onTranslateChange(translate: XY): void;
  onSizeChange(size: { width: number; height: number }): void;
  onBoundsChange(bounds: XY): void;
  onItemSelected(id: SelectedItemID | null): void;
}

export const Graph = (props: Props) => {
  const UI = useUIStore();
  const [ref, setRef] = createSignal<HTMLDivElement | undefined>();

  const model = () => props.graph;

  const pinPositions = new ReactiveWeakMap<Pin, XY>();

  const [size, setSize] = createSignal({ width: 0, height: 0 });
  const [bounds, setBounds] = createStore({ x: 0, y: 0 });

  createResizeObserver(ref, (bounds) => {
    const value = {
      width: bounds.width,
      height: bounds.height,
    };

    props.onSizeChange(value);
    setSize(value);
  });

  function onResize() {
    const bounds = ref()!.getBoundingClientRect()!;

    const value = {
      x: bounds.left,
      y: bounds.top,
    };

    props.onBoundsChange(value);
    setBounds(value);
  }

  function updateScale(delta: number, screenOrigin: XY) {
    const startGraphOrigin = toGraphSpace(screenOrigin, bounds, props.state);

    props.onScaleChange(
      Math.min(
        Math.max(1 / MAX_ZOOM_OUT, props.state.scale + delta / 20),
        MAX_ZOOM_IN
      )
    );

    const endGraphOrigin = toScreenSpace(startGraphOrigin, bounds, props.state);

    const { translate, scale } = props.state;

    props.onTranslateChange({
      x: translate.x + (endGraphOrigin.x - screenOrigin.x) / scale,
      y: translate.y + (endGraphOrigin.y - screenOrigin.y) / scale,
    });
  }

  onMount(() => {
    createEventListener(window, "resize", onResize);
    createResizeObserver(ref, onResize);

    createEventListener(ref, "gesturestart", () => {
      let lastScale = 1;

      createRoot((dispose) => {
        createEventListenerMap(() => ref() ?? [], {
          gestureend: dispose,
          gesturechange: (e: any) => {
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
          },
        });
      });
    });
  });

  const [pan, setPan] = createSignal<PanState>({ state: "none" });

  return (
    <GraphContext.Provider
      value={{
        model,
        get state() {
          return props.state;
        },
        offset: bounds,
        pinPositions,
        toGraphSpace: (xy) => toGraphSpace(xy, bounds, props.state),
        toScreenSpace: (xy) => toScreenSpace(xy, bounds, props.state),
      }}
    >
      <div
        {...props}
        class="flex-1 w-full relative overflow-hidden bg-mg-graph"
        ref={setRef}
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
            props.onTranslateChange({
              x: props.state.translate.x + deltaX,
              y: props.state.translate.y + deltaY,
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
                    graph: props.state,
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
            case 2:
              setPan({
                state: "waiting",
                downposx: e.clientX,
                downposy: e.clientY,
              });

              const oldTranslate = { ...props.state.translate };
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

                  const { scale } = props.state;

                  props.onTranslateChange({
                    x:
                      (startPosition.x - e.clientX + oldTranslate.x * scale) /
                      scale,
                    y:
                      (startPosition.y - e.clientY + oldTranslate.y * scale) /
                      scale,
                  });
                });

                createEventListener(window, "mouseup", dispose);
              });

              break;
          }

          if (typeof props.onMouseDown === "function") props.onMouseDown(e);
        }}
      >
        <ConnectionRender graphBounds={{ ...bounds, ...size() }} />
        <div
          class={clsx(
            "absolute inset-0 text-white origin-top-left overflow-hidden w-[500%] h-[500%]",
            pan().state === "active" && "cursor-grabbing"
          )}
          style={{ transform: `scale(${props.state.scale})` }}
        >
          <div
            class="origin-[0,0]"
            style={{
              transform: `translate(${props.state.translate.x * -1}px, ${
                props.state.translate.y * -1
              }px)`,
            }}
          >
            <For each={[...model().commentBoxes.values()]}>
              {(box) => (
                <CommentBox
                  box={box}
                  onSelected={() =>
                    props.onItemSelected({ type: "commentBox", id: box.id })
                  }
                />
              )}
            </For>
            <For each={[...model().nodes.values()]}>
              {(node) => (
                <Node
                  node={node}
                  onSelected={() =>
                    props.onItemSelected({ type: "node", id: node.id })
                  }
                />
              )}
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
  offset: XY;
  toGraphSpace(pos: XY): XY;
  toScreenSpace(pos: XY): XY;
} | null>(null);

export const useGraphContext = () => {
  const ctx = useContext(GraphContext);

  if (!ctx) throw new Error("CurrentGraphContext is missing!");

  return ctx;
};
