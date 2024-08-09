import { ContextMenu } from "@kobalte/core/context-menu";
import { Dialog } from "@kobalte/core/dialog";
import {
	deserializeClipboardItem,
	graphToClipboardItem,
	readFromClipboard,
	writeClipboardItemToClipboard,
} from "@macrograph/clipboard";
import type { Graph } from "@macrograph/runtime";
import { deserializeGraph } from "@macrograph/runtime-serde";
import { For, type ValidComponent, createMemo, createSignal } from "solid-js";

import {
	ContextMenuContent,
	ContextMenuItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { Button } from "../../settings/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import {
	InlineTextEditor,
	InlineTextEditorContext,
	useInlineTextEditorCtx,
} from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

interface Props {
	currentGraph?: number;
	onGraphClicked(graph: Graph): void;
}

export function Graphs(props: Props) {
	const interfaceCtx = useInterfaceContext();

	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		[...interfaceCtx.core.project.graphs.values()].map(
			(g) => [tokeniseString(g.name), g] as const,
		),
	);

	const filteredGraphs = createTokenisedSearchFilter(search, tokenisedFilters);

	return (
		<SidebarSection title="Graphs" class="overflow-y-hidden flex flex-col">
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
					title="Import graph from clipboard"
					class="p-0.5"
					onClick={async (e) => {
						e.stopPropagation();
						const item = deserializeClipboardItem(await readFromClipboard());
						if (item.type !== "graph") return;

						item.graph.id = interfaceCtx.core.project.generateGraphId();
						const graph = deserializeGraph(
							interfaceCtx.core.project,
							item.graph,
						);
						interfaceCtx.core.project.graphs.set(graph.id, graph);
					}}
				>
					<IconGgImport class="size-4" />
				</IconButton>
				<IconButton
					type="button"
					title="Create graph"
					onClick={(e) => {
						e.stopPropagation();
						const graph = interfaceCtx.execute("createGraph");
						props.onGraphClicked(graph);
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col p-1 space-y-0.5">
					<For each={filteredGraphs()}>
						{(graph) => {
							const [deleteOpen, setDeleteOpen] = createSignal(false);

							return (
								<li class="group/item gap-1">
									<Dialog open={deleteOpen()} onOpenChange={setDeleteOpen}>
										<InlineTextEditorContext>
											{() => {
												const inlineEditorContext = useInlineTextEditorCtx()!;

												return (
													<ContextMenu placement="bottom-start">
														<InlineTextEditor<ValidComponent>
															as={(asProps) => (
																<ContextMenu.Trigger<"button">
																	{...asProps}
																	as="button"
																	type="button"
																	onClick={() => props.onGraphClicked(graph)}
																/>
															)}
															selected={props.currentGraph === graph.id}
															value={graph.name}
															onChange={(value) => {
																interfaceCtx.execute("setGraphName", {
																	graphId: graph.id,
																	name: value,
																});
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
															<ContextMenuItem
																onSelect={() => {
																	writeClipboardItemToClipboard(
																		graphToClipboardItem(graph),
																	);
																}}
															>
																<IconTablerCopy />
																Copy
															</ContextMenuItem>
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
												);
											}}
										</InlineTextEditorContext>
										<Dialog.Portal>
											<Dialog.Overlay class="absolute inset-0 bg-black/40" />
											<Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden mt-96">
												<div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
													<div class="flex flex-row justify-between text-white p-4">
														<Dialog.Title>Confirm Deleting Graph?</Dialog.Title>
													</div>
													<div class="flex flex-row space-x-4 justify-center mb-4">
														<Button
															onClick={() => {
																interfaceCtx.execute("deleteGraph", {
																	graphId: graph.id,
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
