import { createSignal, onMount, Show } from "solid-js";
import { Core, SerializedProject } from "@macrograph/core";

import { CoreProvider } from "./contexts";
import { Graph } from "./components/Graph";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { LeftSidebar, RightSidebar } from "./Sidebars";
import { createEventListener } from "@solid-primitives/event-listener";

export { useCore } from "./contexts";

export default (props: { core: Core }) => {
  const UI = createUIStore(props.core);

  onMount(async () => {
    const savedProject = localStorage.getItem("project");
    if (savedProject)
      await props.core.load(SerializedProject.parse(JSON.parse(savedProject)));

    const firstGraph = props.core.project.graphs.values().next();
    if (firstGraph) UI.setFocusedGraph(firstGraph.value);
  });

  createEventListener(window, "keydown", (e: KeyboardEvent) => {
    if (!e.metaKey && !e.ctrlKey) return;

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
      }
    }
  });

  const [rootRef, setRootRef] = createSignal<HTMLDivElement | undefined>();

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
        </div>
      </UIStoreProvider>
    </CoreProvider>
  );
};
