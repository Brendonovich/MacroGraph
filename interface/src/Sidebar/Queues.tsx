import type { Queue } from "@macrograph/runtime";
import { serializeValue, t } from "@macrograph/typesystem";
import {
	For,
	type JSX,
	Match,
	Show,
	Switch,
	type ValidComponent,
	createMemo,
	createSignal,
} from "solid-js";

import { ContextMenu } from "@kobalte/core/context-menu";
import {
	ContextMenuContent,
	ContextMenuItem,
} from "../components/Graph/ContextMenu";
import { SidebarSection } from "../components/Sidebar";
import { TypeEditor } from "../components/TypeEditor";
import { IconButton } from "../components/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../util";
import {
	InlineTextEditor,
	InlineTextEditorContext,
	useInlineTextEditorCtx,
} from "./InlineTextEditor";
import { SearchInput } from "./SearchInput";

export function Queues(props: {
	queues: Array<Queue>;
	onCreateQueue(): void;
	onRemoveQueue(id: number): void;
	onSetQueueValue(id: number, value: any[]): void;
	onSetQueueItemType(id: number, type: t.Any): void;
	onQueueNameChanged(id: number, name: string): void;
	contextMenu?: (id: number) => JSX.Element;
}) {
	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		props.queues.map((q) => [tokeniseString(q.name), q] as const),
	);

	const filteredQueues = createTokenisedSearchFilter(
		search,
		tokenisedFilters,
	);

	return (
		<SidebarSection title="Queues">
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
					onClick={(e) => {
						e.stopPropagation();
						props.onCreateQueue();
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col divide-y divide-neutral-700 px-2">
					<For each={filteredQueues()}>
						{(queue) => (
							<li class="flex flex-col gap-1 flex-1 group/item py-2 pt-1">
								<InlineTextEditorContext>
									<Show when>
										{(_) => {
											const inlineEditorContext = useInlineTextEditorCtx()!;

											return (
												<ContextMenu>
													<InlineTextEditor<ValidComponent>
														as={(asProps) => (
															<ContextMenu.Trigger {...asProps} />
														)}
														value={queue.name}
														onChange={(value) => {
															props.onQueueNameChanged(queue.id, value);
														}}
													/>
													<ContextMenuContent>
														<ContextMenuItem
															onSelect={() =>
																inlineEditorContext.setEditing(true)
															}
														>
															<IconAntDesignEditOutlined /> Rename
														</ContextMenuItem>
														{props.contextMenu?.(queue.id)}
														<ContextMenuItem
															class="text-red-500"
															onSelect={() => {
																props.onRemoveQueue(queue.id);
															}}
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
								<div class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden space-y-2 bg-black/30 p-2 rounded-md">
									<TypeEditor
										type={queue.itemType}
										onChange={(type) => {
											props.onSetQueueItemType(queue.id, type);
										}}
									/>
									<Switch>
										<Match
											when={
												queue.itemType instanceof t.List ||
												queue.itemType instanceof t.Map ||
												queue.itemType instanceof t.Struct
											}
										>
											<div class="flex flex-row items-end gap-1 rounded p-1 bg-black/30">
												<pre class="flex-1 whitespace-pre-wrap max-w-full text-xs">
													{JSON.stringify(
														serializeValue(queue.value, t.list(queue.itemType)),
														null,
														2,
													)}
												</pre>
												{queue.value.length > 0 && (
													<button
														type="button"
														onClick={() => {
															props.onSetQueueValue(queue.id, []);
														}}
													>
														<IconSystemUiconsReset class="size-4" />
													</button>
												)}
											</div>
										</Match>
										<Match when={true}>
											<div class="flex flex-row items-end gap-1 rounded p-1 bg-black/30">
												<pre class="flex-1 whitespace-pre-wrap max-w-full text-xs">
													{JSON.stringify(
														serializeValue(queue.value, t.list(queue.itemType)),
														null,
														2,
													)}
												</pre>
												{queue.value.length > 0 && (
													<button
														type="button"
														onClick={() => {
															props.onSetQueueValue(queue.id, []);
														}}
													>
														<IconSystemUiconsReset class="size-4" />
													</button>
												)}
											</div>
										</Match>
									</Switch>
								</div>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
