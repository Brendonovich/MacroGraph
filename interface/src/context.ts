import type { Core, Node, Pin, Size, XY } from "@macrograph/runtime";
import { serializeProject } from "@macrograph/runtime-serde";
import { createContextProvider } from "@solid-primitives/context";
import { createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import { ReactiveWeakMap } from "@solid-primitives/map";
import { leading, throttle } from "@solid-primitives/scheduled";
import { makePersisted } from "@solid-primitives/storage";
import { createActionsExecutor } from "./actions";
import type { GraphState, SelectedItemID } from "./components/Graph/Context";
import { MIN_WIDTH } from "./components/Sidebar";

export type Environment = "custom" | "browser";

export const [InterfaceContextProvider, useInterfaceContext] =
  createContextProvider((props: { core: Core; environment: Environment }) => {
    const [hoveringPin, setHoveringPin] = createSignal<Pin | null>(null);
    const [state, setState] = createStore<MouseState>({
      status: "idle",
    });

    const save = leading(
      throttle,
      () => {
        if (props.core.project.disableSave) return;

        localStorage.setItem(
          "project",
          JSON.stringify(serializeProject(props.core.project)),
        );
      },
      500,
    );

    onCleanup(
      props.core.project.events.listen((e) => {
        if (e === "modified") save();
      }),
    );

    const leftSidebar = createSidebarState("left-sidebar");
    const rightSidebar = createSidebarState("right-sidebar");

    const [currentGraphIndex, setCurrentGraphIndex] = makePersisted(
      createSignal<number>(0),
      { name: "current-graph-index" },
    );

    const [graphStates, setGraphStates] = makePersisted(
      createStore<GraphState[]>([]),
      {
        name: "graph-states",
        deserialize: (data) => {
          const json: Array<
            GraphState & {
              // old
              selectedItemId?: SelectedItemID | null;
            }
          > = JSON.parse(data) as any;

          for (const state of json) {
            if ("selectedItemId" in state) {
              if (state.selectedItemId === null) {
                state.selectedItemIds = [];
              } else if (typeof state.selectedItemId === "object") {
                state.selectedItemIds = [state.selectedItemId];
              }

              state.selectedItemId = undefined;
            }
          }

          return json;
        },
      },
    );

    const { execute, undo, redo } = createActionsExecutor(props.core);

    return {
      execute,
      undo,
      redo,
      state,
      setState: (value: MouseState) => {
        setState(reconcile(value));
      },
      hoveringPin,
      setHoveringPin,
      get core() {
        return props.core;
      },
      save,
      nodeSizes: new WeakMap<Node, Size>(),
      pinPositions: new ReactiveWeakMap<Pin, XY>(),
      leftSidebar,
      rightSidebar,
      get environment() {
        return props.environment;
      },
      currentGraphIndex,
      setCurrentGraphIndex,
      graphStates,
      setGraphStates,
    };
  }, null!);

export type InterfaceContext = ReturnType<typeof useInterfaceContext>;

export type SchemaMenuOpenState = {
  status: "schemaMenuOpen";
  position: XY;
  graph: GraphState;
};

// https://stately.ai/registry/editor/embed/1f1797a0-4d3f-4441-b8c7-292f3ed59008?machineId=62d40a42-0c7f-4c26-aa26-ef61b57f0b1b&mode=Design
export type MouseState =
  | { status: "idle" }
  | SchemaMenuOpenState
  | {
      status: "connectionAssignMode";
      pin: Pin;
      state: { status: "active" } | SchemaMenuOpenState;
    }
  | {
      status: "pinDragMode";
      pin: Pin;
      state:
        | { status: "awaitingDragConfirmation" }
        | { status: "draggingPin" }
        | SchemaMenuOpenState;
    };

function createSidebarState(name: string) {
  const [state, setState] = makePersisted(
    createStore({ width: MIN_WIDTH, open: true }),
    { name },
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
