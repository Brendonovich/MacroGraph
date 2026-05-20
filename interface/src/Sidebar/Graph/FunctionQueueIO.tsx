import type { FunctionQueue } from "@macrograph/runtime";
import { For, Show, createMemo } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";

function FunctionQueueSettings(props: { queue: FunctionQueue }) {
	const ctx = useInterfaceContext();

	return (
		<SidebarSection title={`Function Queue: ${props.queue.name}`}>
			<div class="flex flex-col gap-3 p-2">
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
				<div class="text-xs text-neutral-400">
					{props.queue.running.length} running, {props.queue.items.length} waiting
				</div>
			</div>
		</SidebarSection>
	);
}

function FunctionQueueRunning(props: {
	queue: FunctionQueue;
	functionName: (functionId: number) => string;
}) {
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
						{(item) => (
							<div class="flex flex-col gap-1 rounded p-2 bg-amber-950/40 border border-amber-700/40 text-left w-full">
								<span class="text-xs font-medium text-amber-200">
									{props.functionName(item.functionId)}
								</span>
								<pre class="whitespace-pre-wrap max-w-full text-xs text-amber-100/90">
									{JSON.stringify(item.data, null, 2)}
								</pre>
							</div>
						)}
					</For>
				</Show>
			</div>
		</SidebarSection>
	);
}

function FunctionQueueWaiting(props: {
	queue: FunctionQueue;
	functionName: (functionId: number) => string;
}) {
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
					{(item) => (
						<div class="flex flex-col gap-1 rounded p-2 bg-black/30 text-left w-full">
							<span class="text-xs font-medium text-blue-200">
								{props.functionName(item.functionId)}
							</span>
							<pre class="whitespace-pre-wrap max-w-full text-xs">
								{JSON.stringify(item.data, null, 2)}
							</pre>
						</div>
					)}
				</For>
			</div>
		</SidebarSection>
	);
}

export function FunctionQueueIO(props: { queue: FunctionQueue }) {
	const ctx = useInterfaceContext();

	const functionName = (functionId: number) => {
		const fn = ctx.core.project.functions.get(functionId);
		return fn?.name ?? `Function #${functionId}`;
	};

	return (
		<>
			<FunctionQueueSettings queue={props.queue} />
			<FunctionQueueRunning queue={props.queue} functionName={functionName} />
			<FunctionQueueWaiting queue={props.queue} functionName={functionName} />
		</>
	);
}
