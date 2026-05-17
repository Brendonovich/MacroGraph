import type { FunctionQueue } from "@macrograph/runtime";
import { ContextMenu } from "@kobalte/core/context-menu";
import {
	For,
	type ValidComponent,
	createMemo,
	createSignal,
} from "solid-js";

import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuRenameItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor, InlineTextEditorContext } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

export function FunctionQueues(props: {
	project: import("@macrograph/runtime").Project;
	onFunctionQueueClicked(queue: FunctionQueue): void;
}) {
	const ctx = useInterfaceContext();

	const [search, setSearch] = createSignal("");

	const queuesList = createMemo(() => [...props.project.functionQueues.values()]);

	const tokenisedFilters = createMemo(() =>
		queuesList().map((q) => [tokeniseString(q.name), q] as const),
	);

	const filteredQueues = createTokenisedSearchFilter(
		search,
		tokenisedFilters,
	);

	return (
		<SidebarSection title="Function Queues">
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
						ctx.execute("createFunctionQueue");
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
													onClick={() => props.onFunctionQueueClicked(queue)}
												/>
											)}
											value={queue.name}
											onChange={(value) => {
												ctx.execute("setFunctionQueueName", {
													functionQueueId: queue.id,
													name: value,
												});
											}}
										/>
										<ContextMenuContent>
											<ContextMenuRenameItem />
											<ContextMenuItem
												class="text-red-500"
												onSelect={() => {
													if (!window.confirm(`Are you sure you want to delete function queue "${queue.name}"?`)) return;
													ctx.execute("deleteFunctionQueue", {
														functionQueueId: queue.id,
													});
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
