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
  const ui = createUIStore();

  onMount(async () => {
    const savedProject = localStorage.getItem("project");
    if (savedProject)
      setTimeout(
        () => core.load(SerializedProject.parse(JSON.parse(savedProject))),
        2000
      );

    // const firstGraph = core.project.graphs.values().next();
    // if (firstGraph) ui.setCurrentGraph(firstGraph.value);
  });

  return (
    <UIStoreProvider store={ui}>
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
            <GraphList onChange={(g) => ui.setCurrentGraph(g)} />
            <PrintOutput />
          </div>
          <Show when={ui.state.currentGraph} fallback="No Graph">
            {(graph) => <Graph graph={graph()} />}
          </Show>
        </div>
      </CoreProvider>
    </UIStoreProvider>
  );
}

export default App;
