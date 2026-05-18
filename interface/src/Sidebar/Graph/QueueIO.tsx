import { ContextMenu } from "@kobalte/core/context-menu";
import type { Queue } from "@macrograph/runtime";
import { serializeValue } from "@macrograph/typesystem";
import { For, Show, createMemo } from "solid-js";

import {
	ContextMenuContent,
	ContextMenuItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { useInterfaceContext } from "../../context";

function QueueSettings(props: { queue: Queue }) {
	const ctx = useInterfaceContext();

	return (
		<SidebarSection title={`Queue: ${props.queue.name}`}>
			<div class="flex flex-col gap-3 p-2">
				<div class="bg-black/30 p-2 rounded-md">
					<TypeEditor
						type={props.queue.itemType}
						onChange={(type) => {
							ctx.execute("setQueueItemType", {
								queueId: props.queue.id,
								type,
							});
						}}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<label class="flex flex-row items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={props.queue.paused}
							onChange={(e) => {
								ctx.execute("setQueuePaused", {
									queueId: props.queue.id,
									paused: e.currentTarget.checked,
								});
							}}
							class="rounded border-neutral-600"
						/>
						<span class="text-sm text-neutral-200">Paused</span>
					</label>
					<div class="text-xs text-neutral-400">
						{props.queue.items.length} item{props.queue.items.length !== 1 ? 's' : ''} in queue
					</div>
				</div>
			</div>
		</SidebarSection>
	);
}

function QueueItems(props: { queue: Queue }) {
	const ctx = useInterfaceContext();
	const items = createMemo(() => props.queue.items);

	return (
		<SidebarSection title="Queue Items" class="flex-1 overflow-y-hidden flex flex-col">
			<Show when={items().length > 0}>
				<div class="flex flex-row justify-end p-1">
					<button
						type="button"
						class="text-red-400 hover:text-red-300 text-xs"
						onClick={() => {
							ctx.execute("setQueueValue", {
								queueId: props.queue.id,
								value: [],
							});
						}}
					>
						Clear All
					</button>
				</div>
			</Show>
			<div class="flex-1 overflow-y-auto flex flex-col p-2 space-y-2">
				<For each={items()}>
					{(item, index) => (
						<ContextMenu>
							<ContextMenu.Trigger class="flex flex-row items-end gap-1 rounded p-1 bg-black/30 text-left w-full">
								<pre class="flex-1 whitespace-pre-wrap max-w-full text-xs">
									{JSON.stringify(
										serializeValue(item, props.queue.itemType),
										null,
										2,
									)}
								</pre>
							</ContextMenu.Trigger>
							<ContextMenuContent>
								<ContextMenuItem
									class="text-red-500"
									onSelect={() => {
										ctx.execute("removeQueueItem", {
											queueId: props.queue.id,
											index: index(),
										});
									}}
								>
									<IconAntDesignDeleteOutlined />
									Delete
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu>
					)}
				</For>
			</div>
		</SidebarSection>
	);
}

export function QueueIO(props: { queue: Queue }) {
	return (
		<>
			<QueueSettings queue={props.queue} />
			<QueueItems queue={props.queue} />
		</>
	);
}
