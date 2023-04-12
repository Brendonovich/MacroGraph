import { Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core } from "@macrograph/core";
import { createUIStore, UIStoreProvider } from "./UIStore";

function App() {
  const ui = createUIStore();

  const graph = core.createGraph();

  ui.setCurrentGraph(graph);

  return (
    <UIStoreProvider store={ui}>
      <CoreProvider core={core}>
        <div class="w-screen h-screen flex flex-row overflow-hidden select-none">
          <GraphList onChange={(g) => ui.setCurrentGraph(g)} />
          <Show when={ui.state.currentGraph} fallback="No Graph">
            {(graph) => <Graph graph={graph()} />}
          </Show>
        </div>
      </CoreProvider>
    </UIStoreProvider>
  );
}

export default App;
