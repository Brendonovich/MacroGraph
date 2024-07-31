import { Dialog } from "@kobalte/core";
import {
	deserializeClipboardItem,
	graphToClipboardItem,
	readFromClipboard,
	writeClipboardItemToClipboard,
} from "@macrograph/clipboard";
import type { Graph } from "@macrograph/runtime";
import { deserializeGraph } from "@macrograph/runtime-serde";
import { For, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { Button } from "../../settings/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

// React component to show a list of projects
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
						const graph = interfaceCtx.core.project.createGraph();
						props.onGraphClicked(graph);
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col p-1 space-y-0.5">
					<For each={filteredGraphs()}>
						{(graph) => (
							<li class="group/item gap-1">
								<InlineTextEditor
									as="button"
									type="button"
									onClick={() => props.onGraphClicked(graph)}
									value={graph.name}
									onChange={(value) => {
										graph.rename(value);
										interfaceCtx.save();
									}}
								>
									<DeleteButton graph={graph} />
									<IconButton
										class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 p-1"
										title="Copy graph to clipboard"
										onClick={(e) => {
											e.stopPropagation();
											writeClipboardItemToClipboard(
												graphToClipboardItem(graph),
											);
										}}
									>
										<IconTablerCopy class="size-3.5" />
									</IconButton>
								</InlineTextEditor>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}

const DeleteButton = (props: { graph: Graph }) => {
	const interfaceCtx = useInterfaceContext();

	function deleteGraph() {
		interfaceCtx.core.project.graphs.delete(props.graph.id);
		props.graph.dispose();
		interfaceCtx.save();
	}

	return (
		<Dialog.Root>
			<Dialog.Trigger
				as={IconButton}
				class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 p-0.5"
				onClick={(e) => {
					if (!e.shiftKey) return;

					// don't open the dialog if shift is pressed
					e.preventDefault();
					// don't want parent handlers to fire
					e.stopPropagation();

					deleteGraph();
				}}
			>
				<IconAntDesignDeleteOutlined class="size-4" />
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay class="absolute inset-0 bg-black/40" />
				<Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden mt-96">
					<div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
						<div class="flex flex-row justify-between text-white p-4">
							<Dialog.Title>Confirm Deleting Graph?</Dialog.Title>
						</div>
						<div class="flex flex-row space-x-4 justify-center mb-4">
							<Button onClick={deleteGraph}>Delete</Button>
							<Dialog.CloseButton>
								<Button>Cancel</Button>
							</Dialog.CloseButton>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
