import { onMount, Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core, SerializedProject } from "@macrograph/core";
import "@macrograph/packages";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import Settings from "./settings";

function App() {
  const UI = createUIStore();

  onMount(async () => {
    const savedProject = localStorage.getItem("project");
    if (savedProject)
      await core.load(SerializedProject.parse(JSON.parse(savedProject)));

    const firstGraph = core.project.graphs.values().next();
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

  return (
    <UIStoreProvider store={UI}>
      <CoreProvider core={core}>
        <div
          class="w-screen h-screen flex flex-row overflow-hidden select-none"
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
      </CoreProvider>
    </UIStoreProvider>
  );
}

export default App;
