import { createMemo } from "solid-js";

import { useInterfaceContext } from "../../context";
import { FunctionIO } from "./FunctionIO";
import { QueueIO } from "./QueueIO";
import { Outline } from "./Outline";
import { Variables } from "./Variables";

export function Sidebar(props: { graph: import("@macrograph/runtime").Graph }) {
	const ctx = useInterfaceContext();
	const graphFn = createMemo(() => {
		if (props.graph.kind !== "function") return;
		return [...ctx.core.project.functions].find(
			([, f]) => f.graphId === props.graph.id,
		)?.[1];
	});
	const graphQueue = createMemo(() => {
		if (props.graph.kind !== "queue") return;
		return [...ctx.core.project.queues].find(
			([, q]) => q.graphId === props.graph.id,
		)?.[1];
	});
	return (
		<>
			{graphFn() && <FunctionIO fn={graphFn()!} />}
			{graphQueue() && <QueueIO queue={graphQueue()!} />}
			<Variables graph={props.graph} />
			<Outline graph={props.graph} />
		</>
	);
}
