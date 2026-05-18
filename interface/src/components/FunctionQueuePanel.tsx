import { ContextMenu } from "@kobalte/core/context-menu";
import type { FunctionQueue } from "@macrograph/runtime";
import { For, Show, createMemo } from "solid-js";

import {
	ContextMenuContent,
	ContextMenuItem,
} from "./Graph/ContextMenu";
import { useInterfaceContext } from "../context";

export function FunctionQueuePanel(props: { queue: FunctionQueue }) {
	const ctx = useInterfaceContext();
	const items = createMemo(() => props.queue.items);

	const functionName = (functionId: number) => {
		const fn = ctx.core.project.functions.get(functionId);
		return fn?.name ?? `Function #${functionId}`;
	};

	return (
		<div class="w-full max-w-3xl flex flex-col gap-8">
			<div>
				<h1 class="text-xl font-semibold text-white">{props.queue.name}</h1>
				<p class="text-sm text-neutral-400 mt-1">
					Queued function calls run one after another. Use Advance Function Queue
					nodes to run the next waiting item early.
				</p>
			</div>

			<section class="flex flex-col gap-3">
				<h2 class="text-sm font-medium text-neutral-300 uppercase tracking-wide">
					Settings
				</h2>
				<div class="flex flex-col gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
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
					<div class="text-xs text-neutral-400 pt-1">
						{props.queue.items.length} item{props.queue.items.length !== 1 ? "s" : ""} in queue
					</div>
				</div>
			</section>

			<section class="flex flex-col gap-3 flex-1 min-h-0">
				<div class="flex flex-row items-center justify-between">
					<h2 class="text-sm font-medium text-neutral-300 uppercase tracking-wide">
						Queue items
					</h2>
					<Show when={items().length > 0}>
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
							Clear all
						</button>
					</Show>
				</div>
				<Show
					when={items().length > 0}
					fallback={
						<p class="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-700 p-6 text-center">
							No items in the queue yet.
						</p>
					}
				>
					<div class="flex flex-col gap-2">
						<For each={items()}>
							{(item, index) => (
								<ContextMenu>
									<ContextMenu.Trigger class="flex flex-row items-start gap-2 rounded-lg border border-neutral-700 bg-black/30 p-3 text-left w-full">
										<div class="flex flex-col gap-1 min-w-0 flex-1">
											<span class="text-sm font-medium text-blue-200">
												{functionName(item.functionId)}
											</span>
											<pre class="whitespace-pre-wrap text-xs text-neutral-300 overflow-x-auto">
												{JSON.stringify(item.data, null, 2)}
											</pre>
										</div>
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
											Remove
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							)}
						</For>
					</div>
				</Show>
			</section>
		</div>
	);
}
