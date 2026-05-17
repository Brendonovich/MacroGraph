import type { Queue } from "@macrograph/runtime";
import {
	For,
	type JSX,
	type ValidComponent,
	createMemo,
	createSignal,
} from "solid-js";

import { ContextMenu } from "@kobalte/core/context-menu";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuRenameItem,
} from "../components/Graph/ContextMenu";
import { SidebarSection } from "../components/Sidebar";
import { IconButton } from "../components/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../util";
import {
	InlineTextEditor,
	InlineTextEditorContext,
	useInlineTextEditorCtx,
} from "./InlineTextEditor";
import { SearchInput } from "./SearchInput";

export function Queues(props: {
	queues: Map<number, Queue>;
	onCreateQueue(): void;
	onRemoveQueue(id: number): void;
	onQueueNameChanged(id: number, name: string): void;
	onQueueClicked(queue: Queue): void;
	contextMenu?: (id: number) => JSX.Element;
}) {
	const [search, setSearch] = createSignal("");

	const queuesList = createMemo(() => [...props.queues.values()]);

	const tokenisedFilters = createMemo(() =>
		queuesList().map((q) => [tokeniseString(q.name), q] as const),
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
				<ul class="flex flex-col p-1 space-y-0.5">
					<For each={filteredQueues()}>
						{(queue) => (
							<li class="group/item gap-1">
								<InlineTextEditorContext>
									<ContextMenu placement="bottom-start">
										<InlineTextEditor<ValidComponent>
											as={(asProps) => (
												<ContextMenu.Trigger<"button">
													{...asProps}
													as="button"
													type="button"
													onClick={() => props.onQueueClicked(queue)}
												/>
											)}
											value={queue.name}
											onChange={(value) => {
												props.onQueueNameChanged(queue.id, value);
											}}
										/>
										<ContextMenuContent>
											<ContextMenuRenameItem />
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
								</InlineTextEditorContext>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
