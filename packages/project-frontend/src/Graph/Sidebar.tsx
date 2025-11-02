import type { Graph } from "@macrograph/project-domain";
import { For } from "solid-js";

import type { GraphState } from "../State";

export function GraphsSidebar(props: {
  graphs: Record<string, GraphState>;
  selected?: Graph.Id;
  onSelected?: (graph: GraphState) => void;
}) {
  return (
    <>
      <div class="h-8 flex flex-row">
        <input
          class="h-full flex-1 px-2 bg-gray-3 dark:bg-gray-2 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
          placeholder="Search Graphs"
          disabled
        />
        <button
          type="button"
          disabled
          class="bg-transparent h-full disabled:(text-gray-10) px-2 not-disabled:hover:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
        >
          New
        </button>
      </div>
      <ul>
        <For each={Object.values(props.graphs)}>
          {(graph) => (
            <li>
              <button
                type="button"
                class="w-full data-[selected='true']:bg-gray-2 hover:bg-gray-2 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
                data-selected={props.selected === graph.id}
                onClick={() => props.onSelected?.(graph)}
              >
                {graph.name}
              </button>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
