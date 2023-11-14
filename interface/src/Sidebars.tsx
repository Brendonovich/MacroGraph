import { Match, Show, Switch, createMemo } from "solid-js";
import { Graph, Node } from "@macrograph/core";

import { GraphList } from "./components/ProjectSidebar";
import { PrintOutput } from "./components/PrintOutput";
import Settings from "./settings";
import { Sidebar, SidebarSection } from "./components/Sidebar";
import { useUIStore } from "./UIStore";

export function LeftSidebar() {
  const UI = useUIStore();

  return (
    <Sidebar side="left">
      <Settings />
      <div class="overflow-y-auto outer-scroll flex-1">
        <GraphList onChange={(g) => UI.setFocusedGraph(g)} />
        <PrintOutput />
      </div>
    </Sidebar>
  );
}

function GraphSidebar(_: { graph: Graph }) {
  return (
    <>
      <SidebarSection title="Variables"></SidebarSection>
    </>
  );
}

function NodeSidebar(props: { node: Node }) {
  return (
    <>
      <SidebarSection title="Node Properties">
        <p>Name: {props.node.state.name}</p>
      </SidebarSection>
    </>
  );
}

export function RightSidebar() {
  const UI = useUIStore();

  return (
    <Sidebar side="right">
      <Show when={UI.state.focusedGraph}>
        {(graph) => {
          const state = createMemo(() => UI.state.graphStates.get(graph()));

          const selectedItem = {
            get value() {
              return state()?.selectedItem;
            },
          };

          return (
            <Switch fallback={<GraphSidebar graph={graph()} />}>
              <Match
                when={selectedItem.value instanceof Node && selectedItem.value}
              >
                {(item) => <NodeSidebar node={item()} />}
              </Match>
            </Switch>
          );
        }}
      </Show>
    </Sidebar>
  );
}
