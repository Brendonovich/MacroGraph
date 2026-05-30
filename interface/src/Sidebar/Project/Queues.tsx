import {
	queueToClipboardItem,
	serializeClipboardItem,
} from "@macrograph/clipboard";
import type { JSX } from "solid-js";

import type { Project, Queue } from "@macrograph/runtime";
import { useInterfaceContext } from "../../context";
import { usePlatform } from "../../platform";
import { Queues as QueuesRoot } from "../Queues";
import { ContextMenuItem } from "../../components/Graph/ContextMenu";

export function Queues(props: {
	project: Project;
	onQueueClicked(queue: Queue): void;
}) {
	const interfaceCtx = useInterfaceContext();
	const platform = usePlatform();

	const contextMenu = (id: number): JSX.Element => {
		const queue = props.project.queues.get(id);
		if (!queue) return <></>;
		return (
			<ContextMenuItem
				onSelect={() => {
					const graph = props.project.queueGraphs.get(queue.graphId);
					if (!graph) return;
					platform.clipboard.writeText(
						serializeClipboardItem(
							queueToClipboardItem(queue, graph),
						),
					);
				}}
			>
				<IconTablerCopy />
				Copy
			</ContextMenuItem>
		);
	};

	return (
		<QueuesRoot
			queues={props.project.queues}
			onCreateQueue={() => {
				interfaceCtx.execute("createQueue", {});
			}}
			onRemoveQueue={(id) => {
				interfaceCtx.execute("deleteQueue", {
					queueId: id,
				});
			}}
			onQueueNameChanged={(id, name) => {
				interfaceCtx.execute("setQueueName", {
					queueId: id,
					name,
				});
			}}
			onQueueClicked={(queue) => {
				props.onQueueClicked(queue);
			}}
			contextMenu={contextMenu}
		/>
	);
}
