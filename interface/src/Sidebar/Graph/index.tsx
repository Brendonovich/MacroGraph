import type { Graph } from "@macrograph/runtime";

import { Outline } from "./Outline";
import { Variables } from "./Variables";

export function Sidebar(props: { graph: Graph }) {
	return (
		<>
			<Variables graph={props.graph} />
			<Outline graph={props.graph} />
		</>
	);
}
