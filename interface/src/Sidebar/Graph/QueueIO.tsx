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
						{props.queue.running.length} running, {props.queue.items.length} waiting
					</div>
				</div>
			</div>
		</SidebarSection>
	);
}

function QueueRunning(props: { queue: Queue }) {
	const running = createMemo(() => props.queue.running);

	return (
		<SidebarSection title="Running" class="flex flex-col max-h-48">
			<div class="flex-1 overflow-y-auto flex flex-col p-2 space-y-2">
				<Show
					when={running().length > 0}
					fallback={
						<p class="text-xs text-neutral-500 px-1">No items running</p>
					}
				>
					<For each={running()}>
						{(entry) => (
							<div class="flex flex-row items-end gap-1 rounded p-1 bg-amber-950/40 border border-amber-700/40 text-left w-full">
								<pre class="flex-1 whitespace-pre-wrap max-w-full text-xs text-amber-100/90">
									{JSON.stringify(
										serializeValue(entry.value, props.queue.itemType),
										null,
										2,
									)}
								</pre>
							</div>
						)}
					</For>
				</Show>
			</div>
		</SidebarSection>
	);
}

function QueueItems(props: { queue: Queue }) {
	const ctx = useInterfaceContext();
	const items = createMemo(() => props.queue.items);

	return (
		<SidebarSection title="Waiting" class="flex-1 overflow-y-hidden flex flex-col">
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
					{(entry, index) => (
						<ContextMenu>
							<ContextMenu.Trigger class="flex flex-row items-end gap-1 rounded p-1 bg-black/30 text-left w-full">
								<pre class="flex-1 whitespace-pre-wrap max-w-full text-xs">
									{JSON.stringify(
										serializeValue(entry.value, props.queue.itemType),
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
			<QueueRunning queue={props.queue} />
			<QueueItems queue={props.queue} />
		</>
	);
}
