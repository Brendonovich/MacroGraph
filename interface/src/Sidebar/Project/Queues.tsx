import type { Project } from "@macrograph/runtime";
import { useInterfaceContext } from "../../context";
import { Queues as QueuesRoot } from "../Queues";

export function Queues(props: { project: Project }) {
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
			onSetQueueValue={(id, value) => {
				interfaceCtx.execute("setQueueValue", {
					queueId: id,
					value,
				});
			}}
			onSetQueueItemType={(id, type) => {
				interfaceCtx.execute("setQueueItemType", {
					queueId: id,
					type,
				});
			}}
			onQueueNameChanged={(id, name) => {
				interfaceCtx.execute("setQueueName", {
					queueId: id,
					name,
				});
			}}
		/>
	);
}
