import type { GraphFunction } from "@macrograph/runtime";
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
						{({ fn, id }) => (
							<li class="group/item gap-1">
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
													const fnQueues = [...ctx.core.project.functionQueues.values()];
													const affected = fnQueues.filter((q) =>
														q.items.some((i) => i.functionId === id),
													);
													let msg = `Are you sure you want to delete function "${fn.name}"?`;
													if (affected.length > 0) {
														const totalItems = affected.reduce(
															(sum, q) => sum + q.items.filter((i) => i.functionId === id).length,
															0,
														);
														msg += `\n\nThis function is queued in ${totalItems} item(s) across ${affected.length} function queue(s). Those items will be removed.`;
													}
													if (!window.confirm(msg)) return;
													ctx.execute("deleteFunction", { functionId: id });
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
