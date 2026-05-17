import { ContextMenu } from "@kobalte/core/context-menu";
import type { FunctionQueue } from "@macrograph/runtime";
import { For, Show, createMemo } from "solid-js";

import {
	ContextMenuContent,
	ContextMenuItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";

function FunctionQueueSettings(props: { queue: FunctionQueue }) {
	const ctx = useInterfaceContext();

	const functionName = (functionId: number) => {
		const fn = ctx.core.project.functions.get(functionId);
		return fn?.name ?? `Function #${functionId}`;
	};

	return (
		<SidebarSection title={`Function Queue: ${props.queue.name}`}>
			<div class="flex flex-col gap-3 p-2">
				<div class="flex flex-col gap-2">
					<label class="flex flex-row items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={props.queue.paused}
							onChange={(e) => {
								ctx.execute("setFunctionQueuePaused", {
									functionQueueId: props.queue.id,
									paused: e.currentTarget.checked,
								});
							}}
							class="rounded border-neutral-600"
						/>
						<span class="text-sm text-neutral-200">Paused</span>
					</label>
					<label class="flex flex-row items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={props.queue.concurrent}
							onChange={(e) => {
								ctx.execute("setFunctionQueueConcurrent", {
									functionQueueId: props.queue.id,
									concurrent: e.currentTarget.checked,
								});
							}}
							class="rounded border-neutral-600"
						/>
						<span class="text-sm text-neutral-200">
							Concurrent Execution
						</span>
					</label>
					<div class="text-xs text-neutral-400">
						{props.queue.items.length} item{props.queue.items.length !== 1 ? "s" : ""} in queue
					</div>
				</div>
			</div>
		</SidebarSection>
	);
}

function FunctionQueueItems(props: { queue: FunctionQueue }) {
	const ctx = useInterfaceContext();
	const items = createMemo(() => props.queue.items);

	const functionName = (functionId: number) => {
		const fn = ctx.core.project.functions.get(functionId);
		return fn?.name ?? `Function #${functionId}`;
	};

	return (
		<SidebarSection title="Queue Items" class="flex-1 overflow-y-hidden flex flex-col">
			<Show when={items().length > 0}>
				<div class="flex flex-row justify-end p-1">
					<button
						type="button"
						class="text-red-400 hover:text-red-300 text-xs"
						onClick={() => {
							ctx.execute("setFunctionQueueValue", {
								functionQueueId: props.queue.id,
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
									{`${functionName(item.functionId)}: ${JSON.stringify(item.data, null, 2)}`}
								</pre>
							</ContextMenu.Trigger>
							<ContextMenuContent>
								<ContextMenuItem
									class="text-red-500"
									onSelect={() => {
										ctx.execute("removeFunctionQueueItem", {
											functionQueueId: props.queue.id,
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

export function FunctionQueueIO(props: { queue: FunctionQueue }) {
	return (
		<>
			<FunctionQueueSettings queue={props.queue} />
			<FunctionQueueItems queue={props.queue} />
		</>
	);
}
