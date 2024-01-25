import { Graph } from "@macrograph/runtime";

import { Variables } from "./Variables";

export function Sidebar(props: { graph: Graph }) {
  return <Variables graph={props.graph} />;
}
