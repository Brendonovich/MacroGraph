import type { FunctionQueue } from "@macrograph/runtime";
import { ContextMenu } from "@kobalte/core/context-menu";
import { Dialog } from "@kobalte/core/dialog";
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
import { Button } from "../../settings/ui";

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
						{(queue) => {
							const [deleteOpen, setDeleteOpen] = createSignal(false);
							return (
								<li class="group/item gap-1">
									<Dialog open={deleteOpen()} onOpenChange={setDeleteOpen}>
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
															setDeleteOpen(true);
														}}
													>
														<IconAntDesignDeleteOutlined />
														Delete
													</ContextMenuItem>
												</ContextMenuContent>
											</ContextMenu>
										</InlineTextEditorContext>
										<Dialog.Portal>
											<Dialog.Overlay class="absolute inset-0 bg-black/40" />
											<Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden mt-96">
												<div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
													<div class="flex flex-row justify-between text-white p-4">
														<Dialog.Title>Confirm Deleting Function Queue?</Dialog.Title>
													</div>
													<div class="flex flex-row space-x-4 justify-center mb-4">
														<Button
															onClick={() => {
																ctx.execute("deleteFunctionQueue", {
																	functionQueueId: queue.id,
																});
															}}
														>
															Delete
														</Button>
														<Dialog.CloseButton>
															<Button>Cancel</Button>
														</Dialog.CloseButton>
													</div>
												</div>
											</Dialog.Content>
										</Dialog.Portal>
									</Dialog>
								</li>
							);
						}}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
