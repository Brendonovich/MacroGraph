import { For } from "solid-js";
import { Graph } from "@macrograph/runtime";

import { useCoreContext } from "../../contexts";
import { GraphItem } from "./GraphItem";
import { SidebarSection } from "../Sidebar";
import { deserializeClipboardItem, readFromClipboard } from "../../clipboard";

// React component to show a list of projects
interface Props {
  currentGraph?: number;
  onGraphClicked(graph: Graph): void;
}

export const GraphList = (props: Props) => {
  const ctx = useCoreContext();

  return (
    <SidebarSection
      title="Graphs"
      right={
        <div class="flex flex-row items-center text-xl font-bold">
          <button
            class="px-1"
            onClick={async (e) => {
              e.stopPropagation();
              const item = deserializeClipboardItem(await readFromClipboard());
              if (item.type !== "graph") return;

              item.graph.id = ctx.core.project.generateGraphId();
              const graph = await Graph.deserialize(
                ctx.core.project,
                item.graph
              );
              ctx.core.project.graphs.set(graph.id, graph);
            }}
          >
            <IconGgImport />
          </button>
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();
              const graph = ctx.core.project.createGraph();
              props.onGraphClicked(graph);
            }}
          >
            +
          </button>
        </div>
      }
    >
      <For each={[...ctx.core.project.graphs.values()]}>
        {(graph) => (
          <GraphItem
            graph={graph}
            onClick={() => props.onGraphClicked(graph)}
            isCurrentGraph={graph.id === props.currentGraph}
          />
        )}
      </For>
    </SidebarSection>
  );
};
