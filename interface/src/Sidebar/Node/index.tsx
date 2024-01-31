import { Node } from "@macrograph/runtime";
import { Show } from "solid-js";

import { NodeInfo } from "./Info";
import { Properties } from "./Properties";

export function Sidebar(props: { node: Node }) {
  return (
    <>
      <NodeInfo node={props.node} />
      <Show
        when={"properties" in props.node.schema && props.node.schema.properties}
      >
        {(properties) => (
          <Properties node={props.node} properties={properties()} />
        )}
      </Show>
    </>
  );
}
