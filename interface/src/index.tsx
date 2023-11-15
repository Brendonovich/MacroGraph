import { createSignal, onMount, Show } from "solid-js";
import { Core, SerializedProject } from "@macrograph/core";
import { createEventListener } from "@solid-primitives/event-listener";
import { createElementBounds } from "@solid-primitives/bounds";
import {
  createMousePosition,
  createPositionToElement,
} from "@solid-primitives/mouse";

import { CoreProvider } from "./contexts";
import { Graph, toGraphSpace } from "./components/Graph";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { LeftSidebar, RightSidebar } from "./Sidebars";
import { SchemaMenu } from "./components/SchemaMenu";

export { useCore } from "./contexts";

export default (props: { core: Core }) => {
  const UI = createUIStore(props.core);

  const [rootRef, setRootRef] = createSignal<HTMLDivElement | undefined>();
  const rootBounds = createElementBounds(rootRef);

  const mouse = createMousePosition(window);

  onMount(async () => {
    const savedProject = localStorage.getItem("project");
    if (savedProject)
      await props.core.load(SerializedProject.parse(JSON.parse(savedProject)));

    const firstGraph = props.core.project.graphs.values().next();
    if (firstGraph) UI.setFocusedGraph(firstGraph.value);
  });

  createEventListener(window, "keydown", (e) => {
    switch (e.code) {
      case "KeyC": {
        if (!e.metaKey && !e.ctrlKey) return;

        if (!UI.focusedGraphState?.selectedItem) return;

        UI.copyItem(UI.focusedGraphState?.selectedItem);

        break;
      }
      case "KeyV": {
        if (!e.metaKey && !e.ctrlKey) return;

        UI.pasteClipboard();

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
          if (!UI.state.hoveredGraph) return;

          UI.state.schemaMenu = {
            status: "open",
            position: {
              x: mouse.x,
              y: mouse.y,
            },
            graph: UI.state.graphStates.get(UI.state.hoveredGraph)!,
          };
        }

        break;
      }
      default: {
        return;
      }
    }
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
          <LeftSidebar />

          <Show
            when={UI.state.focusedGraph}
            fallback={
              <div class="flex-1 flex h-full justify-center items-center text-white">
                No graph selected
              </div>
            }
          >
            {(graph) => <Graph graph={graph()} />}
          </Show>

          <RightSidebar />

          <Show
            when={UI.state.schemaMenu.status === "open" && UI.state.schemaMenu}
          >
            {(data) => (
              <SchemaMenu
                graph={data().graph}
                position={{
                  x: data().position.x - rootBounds.left ?? 0,
                  y: data().position.y - rootBounds.top ?? 0,
                }}
                onSchemaClicked={(s) => {
                  data().graph.model.createNode({
                    schema: s,
                    position: toGraphSpace(data().position, data().graph),
                  });

                  UI.state.schemaMenu = { status: "closed" };
                }}
              />
            )}
          </Show>
        </div>
      </UIStoreProvider>
    </CoreProvider>
  );
};
