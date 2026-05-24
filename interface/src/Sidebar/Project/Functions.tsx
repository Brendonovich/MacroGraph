import type { GraphFunction } from "@macrograph/runtime";
import { ContextMenu } from "@kobalte/core/context-menu";
import { Dialog } from "@kobalte/core/dialog";
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
	ContextMenuRenameItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor, InlineTextEditorContext } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";
import { Button } from "../../settings/ui";

export function Functions(props?: { onFunctionClicked?: (fn: GraphFunction) => void }) {
	const ctx = useInterfaceContext();

	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		[...ctx.core.project.functions].map(([id, fn]) => [tokeniseString(fn.name), { id, fn }] as const),
	);

	const filteredFns = createTokenisedSearchFilter(search, tokenisedFilters);

	return (
		<SidebarSection title="Functions" class="overflow-y-hidden flex flex-col">
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
					title="Create function"
					class="p-0.5"
					onClick={(e) => {
						e.stopPropagation();
						ctx.execute("createFunction");
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col p-1 space-y-0.5">
					<For each={filteredFns()}>
						{({ fn, id }) => {
							const [deleteOpen, setDeleteOpen] = createSignal(false);
							const fnQueues = [...ctx.core.project.functionQueues.values()];
							const affected = fnQueues.filter((q) =>
								q.items.some((i) => i.functionId === id),
							);
							const totalItems = affected.reduce(
								(sum, q) => sum + q.items.filter((i) => i.functionId === id).length,
								0,
							);
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
															onClick={() => {
																props?.onFunctionClicked?.(fn);
															}}
														/>
													)}
													value={fn.name}
													onChange={(name) => {
														ctx.execute("setFunctionName", { functionId: id, name });
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
														<Dialog.Title>Confirm Deleting Function?</Dialog.Title>
													</div>
													<div class="flex flex-col px-4 pb-2 text-white/80 text-sm">
														<span>Are you sure you want to delete function "{fn.name}"?</span>
														<Show when={affected.length > 0}>
															<span class="mt-1">
																This function is queued in {totalItems} item(s) across {affected.length} function queue(s). Those items will be removed.
															</span>
														</Show>
													</div>
													<div class="flex flex-row space-x-4 justify-center mb-4">
														<Button
															onClick={() => {
																ctx.execute("deleteFunction", { functionId: id });
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
