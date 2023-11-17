import { XY, Graph, Node, Pin } from "@macrograph/core";
import { createMutable } from "solid-js/store";
import { createContext, useContext, ParentProps } from "solid-js";

import { GraphState } from "./components/Graph";

export type SchemaMenuState =
  | { status: "closed" }
  | { status: "open"; position: XY; graph: GraphState };

export function createUIStore() {
  const state = createMutable({
    draggingPin: null as Pin | null,
    hoveringPin: null as Pin | null,
    mouseDragLocation: null as XY | null,
    mouseDownTranslate: null as XY | null,

    hoveredGraph: null as { model: Graph; state: GraphState } | null,

    schemaMenu: {
      status: "closed",
    } as SchemaMenuState,
  });

  return {
    state,
    setDraggingPin(pin?: Pin) {
      state.draggingPin = pin ?? null;
    },
    setHoveringPin(pin?: Pin) {
      state.hoveringPin = pin ?? null;
    },
    setMouseDragLocation(location?: XY) {
      state.mouseDragLocation = location ?? null;
    },
    setMouseDownTranslate(translate?: XY) {
      state.mouseDownTranslate = translate ?? null;
    },
  };
}

export type UIStore = ReturnType<typeof createUIStore>;

const UIStoreContext = createContext<UIStore | null>(null);

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
