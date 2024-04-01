import { Node } from "@macrograph/runtime";
import { ParentProps } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";

function Field(props: ParentProps<{ name: string }>) {
  return (
    <div class="flex flex-col leading-5">
      <label class="text-xs font-medium text-gray-200">{props.name}</label>
      <span>{props.children}</span>
    </div>
  );
}

export function NodeInfo(props: { node: Node }) {
  return (
    <SidebarSection title="Node Info" class="p-2 space-y-2">
      <Field name="Name">{props.node.state.name}</Field>
      <Field name="Schema">{props.node.schema.name}</Field>
      <Field name="Schema Package">{props.node.schema.package.name}</Field>
    </SidebarSection>
  );
}
