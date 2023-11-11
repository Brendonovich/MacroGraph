import { Match, Show, Switch } from "solid-js";
import { Graph, Node } from "@macrograph/core";

import { GraphList } from "./components/ProjectSidebar";
import { PrintOutput } from "./components/PrintOutput";
import Settings from "./settings";
import { Side, Sidebar, SidebarSection } from "./components/Sidebar";
import { useUIStore } from "./UIStore";

export function LeftSidebar() {
  const UI = useUIStore();

  return (
    <Sidebar side={Side.left}>
      <Settings />
      <GraphList onChange={(g) => UI.setCurrentGraph(g)} />
      <PrintOutput />
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
    <Sidebar side={Side.right}>
      <Switch
        fallback={
          <Show when={UI.state.currentGraph}>
            {(graph) => <GraphSidebar graph={graph()} />}
          </Show>
        }
      >
        <Match
          when={UI.state.selectedItem instanceof Node && UI.state.selectedItem}
        >
          {(item) => <NodeSidebar node={item()} />}
        </Match>
      </Switch>
    </Sidebar>
  );
}
