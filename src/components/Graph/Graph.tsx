import clsx from "clsx";
import { createContext, useContext } from "solid-js";

import { Node } from "./Node";
import { ConnectionRender, SchemaMenu } from "~/components/Graph";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Graph as GraphModel } from "~/models";
import { useUIStore } from "~/stores";

enum PanState {
  None,
  Waiting,
  Active,
}

interface Props {
  graph: GraphModel;
}

export const Graph = (props: Props) => {
  const graph = props.graph;

  const UI = useUIStore();

  let graphRef: HTMLDivElement;

  let lastScale = 1;

  const listener = (e: any) => {
    let scale = e.scale;
    let direction = 1;
    if (scale < 1) {
      direction = -1;
      scale = 1 / scale;
      if (lastScale < 1) {
        lastScale = 1 / lastScale;
      }
    }

    UI.updateScale((scale - lastScale) * direction, {
      x: e.clientX,
      y: e.clientY,
    });

    lastScale = e.scale;
  };

  const resetListener = () => (lastScale = 1);

  onMount(() => {
    const bounds = graphRef.getBoundingClientRect()!;

    UI.setGraphOffset({
      x: bounds.left,
      y: bounds.top,
    });

    graphRef.addEventListener("gesturestart", resetListener);
    graphRef.addEventListener("gesturechange", listener);

    onCleanup(() => {
      graphRef.removeEventListener("gesturechange", listener);
      graphRef.removeEventListener("gesturechange", resetListener);
    });
  });

  const [pan, setPan] = createSignal(PanState.None);

  return (
    <GraphContext.Provider value={graph}>
      <div class="flex-1 relative overflow-hidden bg-gray-graph">
        <Show when={UI.state.schemaMenuPosition}>
          {(pos) => (
            <SchemaMenu
              position={pos()}
              onSchemaClicked={(s) => {
                graph.createNode({
                  schema: s,
                  position: UI.toGraphSpace(pos()),
                });
                UI.setSchemaMenuPosition();
              }}
            />
          )}
        </Show>
        <ConnectionRender />
        <div
          ref={graphRef!}
          class={clsx(
            "absolute inset-0 text-white origin-top-left",
            pan() === PanState.Active && "cursor-grabbing"
          )}
          style={{
            transform: `scale(${UI.state.scale})`,
          }}
          onWheel={(e) => {
            let deltaX = e.deltaX,
              deltaY = e.deltaY,
              isTouchpad = false;

            if (Math.abs((e as any).wheelDeltaY) === Math.abs(e.deltaY) * 3) {
              deltaX = -(e as any).wheelDeltaX / 3;
              deltaY = -(e as any).wheelDeltaY / 3;
              isTouchpad = true;
            }

            if (e.ctrlKey) {
              const delta = ((isTouchpad ? 1 : -1) * deltaY) / 50;
              UI.updateScale(delta, {
                x: e.clientX,
                y: e.clientY,
              });
            } else {
              UI.updateTranslate({
                x: deltaX / UI.state.scale,
                y: deltaY / UI.state.scale,
              });
            }
          }}
          onMouseUp={(e) => {
            switch (e.button) {
              case 2:
                if (pan() === PanState.Waiting) {
                  if (UI.state.mouseDragLocation) UI.setMouseDragLocation();
                  else
                    UI.setSchemaMenuPosition({
                      x: e.clientX - UI.state.graphOffset.x,
                      y: e.clientY - UI.state.graphOffset.y,
                    });
                }
                setPan(PanState.None);
                break;
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            switch (e.button) {
              case 0:
                UI.setSchemaMenuPosition();
                UI.setSelectedNode();
                break;
              case 2:
                setPan(PanState.Waiting);
                UI.setMouseDownLocation({
                  x: e.clientX,
                  y: e.clientY,
                });
                UI.setMouseDownTranslate({
                  ...UI.state.translate,
                });
                break;
            }
          }}
          onMouseMove={(e) => {
            if (pan() === PanState.None) return;
            if (pan() === PanState.Waiting) setPan(PanState.Active);

            UI.setSchemaMenuPosition();

            UI.setTranslate({
              x:
                (UI.state.mouseDownLocation!.x -
                  e.clientX +
                  UI.state.mouseDownTranslate!.x * UI.state.scale) /
                UI.state.scale,
              y:
                (UI.state.mouseDownLocation!.y -
                  e.clientY +
                  UI.state.mouseDownTranslate!.y * UI.state.scale) /
                UI.state.scale,
            });
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <For each={[...graph.nodes.values()]}>
            {(node) => <Node node={node} />}
          </For>
        </div>
      </div>
    </GraphContext.Provider>
  );
};

const GraphContext = createContext<GraphModel | null>(null);

export const useGraph = () => {
  const ctx = useContext(GraphContext);

  if (!ctx) throw new Error("CurrentGraphContext is missing!");

  return ctx;
};
