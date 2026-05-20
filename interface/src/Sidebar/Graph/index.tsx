import { createMemo, onMount } from "solid-js";

import { useInterfaceContext } from "../../context";
import { mark } from "../../graphPerf";
import { FunctionIO } from "./FunctionIO";
import { FunctionQueueIO } from "./FunctionQueueIO";
import { QueueIO } from "./QueueIO";
import { Outline } from "./Outline";
import { Variables } from "./Variables";

export function Sidebar(props: { graph: import("@macrograph/runtime").Graph }) {
	const ctx = useInterfaceContext();

	onMount(() => {
		mark("sidebar.graph.mount", {
			kind: props.graph.kind,
			nodes: props.graph.nodes.size,
			commentBoxes: props.graph.commentBoxes.size,
		});
	});

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
	const graphFunctionQueue = createMemo(() => {
		if (props.graph.kind !== "functionQueue") return;
		return [...ctx.core.project.functionQueues].find(
			([, q]) => q.graphId === props.graph.id,
		)?.[1];
	});
	return (
		<>
			{graphFn() && <FunctionIO fn={graphFn()!} />}
			{graphQueue() && <QueueIO queue={graphQueue()!} />}
			{graphFunctionQueue() && (
				<FunctionQueueIO queue={graphFunctionQueue()!} />
			)}
			<Variables graph={props.graph} />
			<Outline graph={props.graph} />
		</>
	);
}
