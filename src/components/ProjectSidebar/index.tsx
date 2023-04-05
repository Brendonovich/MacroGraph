import { For } from "solid-js";
import { useCore } from "~/contexts";
import { Graph } from "~/models";
import { useUIStore } from "~/stores";
import { GraphItem } from "./GraphItem";

// React component to show a list of projects
interface Props {
  onChange: (graph: Graph) => void;
}

export const GraphList = (props: Props) => {
  const core = useCore();
  const UI = useUIStore();

  return (
    <div class="flex flex-col w-64 bg-neutral-600 shadow-2xl">
      <div class="flex flex-row bg-neutral-900 text-white px-2 font-medium shadow">
        <div class="flex-1 py-1">Graphs</div>
        <button
          class="text-xl font-bold"
          onClick={() => {
            const graph = core.createGraph();
            UI.setCurrentGraph(graph);
          }}
        >
          +
        </button>
      </div>
      <For each={[...core.graphs.values()]}>
        {(graph) => (
          <GraphItem
            graph={graph}
            onClick={() => props.onChange(graph)}
            isCurrentGraph={graph === UI.state.currentGraph}
          />
        )}
      </For>
    </div>
  );
};
