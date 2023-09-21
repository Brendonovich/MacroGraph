import { createSignal, onMount, Show } from "solid-js";
import { Core, SerializedProject } from "@macrograph/core";

import { CoreProvider } from "./contexts";
import { Graph } from "./components/Graph";
import { GraphList } from "./components/ProjectSidebar";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import Settings from "./settings";

export { useCore } from "./contexts";

export default (props: { core: Core }) => {
  const UI = createUIStore(props.core);

  onMount(async () => {
    const savedProject = localStorage.getItem("project");
    if (savedProject)
      await props.core.load(SerializedProject.parse(JSON.parse(savedProject)));

    const firstGraph = props.core.project.graphs.values().next();
    if (firstGraph) UI.setCurrentGraph(firstGraph.value);
  });

  onMount(() => {
    const ctrlHandlers = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;

      switch (e.code) {
        case "KeyC": {
          if (!e.metaKey && !e.ctrlKey) return;
          const selectedItem = UI.state.selectedItem;
          if (selectedItem === null) return;

          UI.copyItem(selectedItem);

          break;
        }
        case "KeyV": {
          if (!e.metaKey && !e.ctrlKey) return;

          UI.pasteClipboard();
        }
      }
    };

    window.addEventListener("keydown", ctrlHandlers);

    return () => {
      window.removeEventListener("keydown", ctrlHandlers);
    };
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
          <div class="flex flex-col bg-neutral-600 w-64 shadow-2xl">
            <Settings />
            <GraphList onChange={(g) => UI.setCurrentGraph(g)} />
            <PrintOutput />
          </div>
          <Show when={UI.state.currentGraph} fallback="No Graph">
            {(graph) => <Graph graph={graph()} />}
          </Show>
        </div>
      </UIStoreProvider>
    </CoreProvider>
  );
};
