import { createMemo } from "solid-js";

import { useInterfaceContext } from "../../context";
import { Outline } from "./Outline";
import { Variables } from "./Variables";
import { FunctionIO } from "./FunctionIO";

export function Sidebar(props: { graph: import("@macrograph/runtime").Graph }) {
	const ctx = useInterfaceContext();
	const graphFn = createMemo(() =>
		[...ctx.core.project.functions].find(([, f]) => f.graphId === props.graph.id)?.[1],
	);

	return (
		<>
			<Variables graph={props.graph} />
			{graphFn() && <FunctionIO fn={graphFn()!} />}
			<Outline graph={props.graph} />
		</>
	);
}
