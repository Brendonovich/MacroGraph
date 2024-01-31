import { Node } from "@macrograph/runtime";
import { SidebarSection } from "../../components/Sidebar";

export function NodeInfo(props: { node: Node }) {
  return (
    <SidebarSection title="Node Info" class="p-2 space-y-2">
      <p>Name: {props.node.state.name}</p>
      <p>Schema: {props.node.schema.name}</p>
      <p>Schema Package: {props.node.schema.package.name}</p>
    </SidebarSection>
  );
}
