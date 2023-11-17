import { For } from "solid-js";
import { Graph } from "@macrograph/core";
import { CgImport } from "solid-icons/cg";

import { useCore } from "../../contexts";
import { useUIStore } from "../../UIStore";
import { GraphItem } from "./GraphItem";
import { SidebarSection } from "../Sidebar";

// React component to show a list of projects
interface Props {
  currentGraph?: number;
  onGraphClicked(graph: Graph): void;
}

export const GraphList = (props: Props) => {
  const core = useCore();
  const UI = useUIStore();

  return (
    <SidebarSection
      title="Graphs"
      right={
        <div class="flex flex-row items-center text-xl font-bold">
          <button
            class="px-1"
            onClick={async (e) => {
              e.stopPropagation();
              UI.pasteClipboard();
            }}
          >
            <CgImport />
          </button>
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();
              const graph = core.project.createGraph();
              props.onGraphClicked(graph);
            }}
          >
            +
          </button>
        </div>
      }
    >
      <For each={[...core.project.graphs.values()]}>
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
