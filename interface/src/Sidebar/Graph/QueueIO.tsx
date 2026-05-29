import { ContextMenu } from "@kobalte/core/context-menu";
import type { Queue } from "@macrograph/runtime";
import {
	For,
	Show,
	type ValidComponent,
	createMemo,
	createSignal,
} from "solid-js";

import {
	ContextMenuContent,
	ContextMenuItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import {
	InlineTextEditor,
	InlineTextEditorContext,
	useInlineTextEditorCtx,
} from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

function FieldList(props: {
	title: string;
	items: Array<{ id: string; name: string; type: any }>;
	onAdd: () => void;
	onDelete: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onTypeChange: (id: string, type: any) => void;
}) {
	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		props.items.map((f) => [tokeniseString(f.name), f] as const),
	);
	const filtered = createTokenisedSearchFilter(search, tokenisedFilters);

	return (
		<SidebarSection title={props.title}>
			<div class="flex flex-row items-center w-full gap-1 p-1 border-b border-neutral-900">
				<SearchInput
					value={search()}
					onInput={(e) => {
						e.stopPropagation();
						setSearch(e.currentTarget.value);
					}}
				/>
				<IconButton
					type="button"
					title={`Add ${props.title}`}
					class="p-0.5"
					onClick={(e) => {
						e.stopPropagation();
						props.onAdd();
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col divide-y divide-neutral-700 px-2">
					<For each={filtered()}>
						{(item) => (
							<li class="flex flex-col gap-1 flex-1 group/item py-2 pt-1">
								<InlineTextEditorContext>
									<Show when>
										{(_) => {
											const inlineEditorCtx = useInlineTextEditorCtx()!;
											return (
												<ContextMenu placement="bottom-start">
													<InlineTextEditor<ValidComponent>
														as={(asProps) => (
															<ContextMenu.Trigger {...asProps} />
														)}
														value={item.name}
														onChange={(name) => props.onRename(item.id, name)}
													/>
													<ContextMenuContent>
														<ContextMenuItem
															onSelect={() => inlineEditorCtx.setEditing(true)}
														>
															<IconAntDesignEditOutlined /> Rename
														</ContextMenuItem>
														<ContextMenuItem
															class="text-red-500"
															onSelect={() => props.onDelete(item.id)}
														>
															<IconAntDesignDeleteOutlined />
															Delete
														</ContextMenuItem>
													</ContextMenuContent>
												</ContextMenu>
											);
										}}
									</Show>
								</InlineTextEditorContext>
								<div class="bg-black/30 p-2 rounded-md">
									<TypeEditor
										type={item.type}
										onChange={(type) => props.onTypeChange(item.id, type)}
									/>
								</div>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}

function QueueSettings(props: { queue: Queue }) {
	const ctx = useInterfaceContext();

	return (
		<SidebarSection title={`Queue: ${props.queue.name}`}>
			<div class="flex flex-col gap-3 p-2">
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
									{JSON.stringify(entry.data, null, 2)}
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
									{JSON.stringify(entry.data, null, 2)}
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
	const ctx = useInterfaceContext();

	return (
		<>
			<QueueSettings queue={props.queue} />
			<FieldList
				title="Inputs"
				items={props.queue.inputs.map((f) => ({ id: f.id, name: f.name ?? f.id, type: f.type }))}
				onAdd={() => ctx.execute("createQueueInput", { queueId: props.queue.id })}
				onDelete={(id) => ctx.execute("deleteQueueInput", { queueId: props.queue.id, inputId: id })}
				onRename={(id, name) => ctx.execute("setQueueInputName", { queueId: props.queue.id, inputId: id, name })}
				onTypeChange={(id, type) => ctx.execute("setQueueInputType", { queueId: props.queue.id, inputId: id, type })}
			/>
			<FieldList
				title="Outputs"
				items={props.queue.outputs.map((f) => ({ id: f.id, name: f.name ?? f.id, type: f.type }))}
				onAdd={() => ctx.execute("createQueueOutput", { queueId: props.queue.id })}
				onDelete={(id) => ctx.execute("deleteQueueOutput", { queueId: props.queue.id, outputId: id })}
				onRename={(id, name) => ctx.execute("setQueueOutputName", { queueId: props.queue.id, outputId: id, name })}
				onTypeChange={(id, type) => ctx.execute("setQueueOutputType", { queueId: props.queue.id, outputId: id, type })}
			/>
			<QueueRunning queue={props.queue} />
			<QueueItems queue={props.queue} />
		</>
	);
}