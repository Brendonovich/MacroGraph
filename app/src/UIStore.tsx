import { Position, XY, Graph, Node, Pin } from "@macrograph/core";
import { createMutable } from "solid-js/store";
import { createContext, ParentProps, useContext } from "solid-js";
import { ReactiveWeakMap } from "@solid-primitives/map";

export function createUIStore() {
  const state = createMutable({
    selectedNode: null as Node | null,
    draggingPin: null as Pin | null,
    hoveringPin: null as Pin | null,
    mouseDragLocation: null as XY | null,
    schemaMenuPosition: null as Position | null,
    mouseDownLocation: null as XY | null,
    mouseDownTranslate: null as XY | null,

    currentGraph: null as Graph | null,

    graphOffset: {
      x: 0,
      y: 0,
    } as XY,
    translate: {
      x: 0,
      y: 0,
    } as XY,
    scale: 1,

    pinPositions: new ReactiveWeakMap<Pin, XY>(),
  });

  return {
    state,
    toGraphSpace(point: XY) {
      return {
        x: point.x / state.scale + state.translate.x,
        y: point.y / state.scale + state.translate.y,
      };
    },
    // Converts a location in the graph (eg the graph's origin (0,0)) to its location on screen
    toScreenSpace(point: XY) {
      return {
        x: (point.x - state.translate.x) * state.scale,
        y: (point.y - state.translate.y) * state.scale,
      };
    },
    setSelectedNode(node?: Node) {
      state.selectedNode?.setSelected(false);
      state.selectedNode = node ?? null;
      state.selectedNode?.setSelected(true);
    },
    setPinPosition(pin: Pin, position: XY) {
      state.pinPositions.set(pin, position);
    },
    updateTranslate(delta: XY) {
      state.translate.x += delta.x;
      state.translate.y += delta.y;
    },
    setTranslate(translate: XY) {
      state.translate = translate;
    },
    updateScale(delta: number, screenOrigin: XY) {
      const startGraphOrigin = this.toGraphSpace(screenOrigin);
      state.scale = Math.min(Math.max(1, state.scale + delta), 2.5);
      const endGraphOrigin = this.toScreenSpace(startGraphOrigin);

      state.translate = {
        x:
          state.translate.x + (endGraphOrigin.x - screenOrigin.x) / state.scale,
        y:
          state.translate.y + (endGraphOrigin.y - screenOrigin.y) / state.scale,
      };
    },
    setDraggingPin(pin?: Pin) {
      state.draggingPin = pin ?? null;
    },
    setHoveringPin(pin?: Pin) {
      state.hoveringPin = pin ?? null;
    },
    setMouseDragLocation(location?: XY) {
      state.mouseDragLocation = location ?? null;
    },
    setMouseDownLocation(location?: XY) {
      state.mouseDownLocation = location ?? null;
    },
    setSchemaMenuPosition(position?: XY) {
      state.schemaMenuPosition = position ?? null;
    },
    setMouseDownTranslate(translate?: XY) {
      state.mouseDownTranslate = translate ?? null;
    },
    setGraphOffset(offset: XY) {
      state.graphOffset = offset;
    },
    setCurrentGraph(graph: Graph) {
      this.setSchemaMenuPosition();
      state.currentGraph = graph;
    },
  };
}

export type UIStore = ReturnType<typeof createUIStore>;

const UIStoreContext = createContext<UIStore>(null as any);

export const useUIStore = () => {
  const ctx = useContext(UIStoreContext);

  if (!ctx) throw new Error("UIStoreContext not found!");

  return ctx;
};

export const UIStoreProvider = (props: ParentProps<{ store: UIStore }>) => {
  return (
    <UIStoreContext.Provider value={props.store}>
      {props.children}
    </UIStoreContext.Provider>
  );
};
