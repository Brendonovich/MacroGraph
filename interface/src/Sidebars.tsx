import { Graph, Node } from "@macrograph/core";
import { SidebarSection } from "./components/Sidebar";
import { For } from "solid-js";

export function GraphSidebar(props: { graph: Graph }) {
  return (
    <>
      <SidebarSection
        title="Variables"
        right={
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();
              props.graph.createVariable({
                name: "New Variable",
                value: "",
              });
            }}
          >
            +
          </button>
        }
      >
        <For each={props.graph.variables}>
          {(variable, index) => (
            <p>
              {variable.name}: {variable.value}
            </p>
          )}
        </For>
      </SidebarSection>
    </>
  );
}

export function NodeSidebar(props: { node: Node }) {
  return (
    <>
      <SidebarSection title="Node Properties">
        <p>Name: {props.node.state.name}</p>
      </SidebarSection>
    </>
  );
}
