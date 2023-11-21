import { Graph, Node } from "@macrograph/core";
import { SidebarSection } from "./components/Sidebar";

export function GraphSidebar(_: { graph: Graph }) {
  return (
    <>
      <SidebarSection title="Variables"></SidebarSection>
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
