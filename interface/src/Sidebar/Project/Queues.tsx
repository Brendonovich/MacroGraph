import type { Project, Queue } from "@macrograph/runtime";
import { useInterfaceContext } from "../../context";
import { Queues as QueuesRoot } from "../Queues";

export function Queues(props: {
	project: Project;
	onQueueClicked(queue: Queue): void;
}) {
	const interfaceCtx = useInterfaceContext();

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
		/>
	);
}
