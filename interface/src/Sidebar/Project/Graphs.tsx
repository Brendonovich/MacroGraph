import { Dialog } from "@kobalte/core";
import { Graph } from "@macrograph/runtime";
import {
	For,
	Match,
	Switch,
	batch,
	createMemo,
	createSignal,
	onMount,
} from "solid-js";

import { deserializeClipboardItem, readFromClipboard } from "../../clipboard";
import { SidebarSection } from "../../components/Sidebar";
import { useCore, useCoreContext } from "../../contexts";
import { Button } from "../../settings/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { SearchInput } from "../SearchInput";

// React component to show a list of projects
interface Props {
	currentGraph?: number;
	onGraphClicked(graph: Graph): void;
}

export function Graphs(props: Props) {
	const ctx = useCoreContext();

	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		[...ctx.core.project.graphs.values()].map(
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
				<button
					type="button"
					title="Import graph from clipboard"
					class="hover:bg-white/10 rounded transition-colors p-0.5"
					onClick={async (e) => {
						e.stopPropagation();
						const item = deserializeClipboardItem(await readFromClipboard());
						if (item.type !== "graph") return;

						item.graph.id = ctx.core.project.generateGraphId();
						const graph = Graph.deserialize(ctx.core.project, item.graph);
						ctx.core.project.graphs.set(graph.id, graph);
					}}
				>
					<IconGgImport class="size-4" />
				</button>
				<button
					type="button"
					title="Create graph"
					class="hover:bg-white/10 rounded transition-colors"
					onClick={(e) => {
						e.stopPropagation();
						const graph = ctx.core.project.createGraph();
						props.onGraphClicked(graph);
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</button>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col p-1 space-y-0.5">
					<For each={filteredGraphs()}>
						{(graph) => (
							<GraphItem
								graph={graph}
								onClick={() => props.onGraphClicked(graph)}
								isCurrentGraph={graph.id === props.currentGraph}
							/>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}

interface GraphItemProps {
	graph: Graph;
	onClick: () => void;
	isCurrentGraph: boolean;
}

function GraphItem(props: GraphItemProps) {
	const [editing, setEditing] = createSignal(false);

	return (
		<li class="flex flex-row group/item items-center gap-1">
			<Switch>
				<Match when={editing()}>
					{(_) => {
						const [value, setValue] = createSignal(props.graph.name);
						let ref: HTMLInputElement;

						let focused = false;

						onMount(() => {
							setTimeout(() => {
								ref.focus();
								ref.focus();
								focused = true;
							});
						});

						return (
							<>
								<input
									ref={ref!}
									class="flex-1 bg-neutral-900 rounded text-sm border-none py-0.5 px-1.5"
									value={value()}
									onInput={(e) => {
										setValue(e.target.value);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											e.stopPropagation();

											if (!focused) return;
											batch(() => {
												props.graph.rename(value());
												setEditing(false);
											});
										} else if (e.key === "Escape") {
											e.preventDefault();
											e.stopPropagation();

											setEditing(false);
										}
										e.stopPropagation();
									}}
									onFocusOut={() => {
										if (!focused) return;
										batch(() => {
											props.graph.rename(value());
											setEditing(false);
										});
									}}
								/>
							</>
						);
					}}
				</Match>
				<Match when={!editing()}>
					<span
						class="flex-1 hover:bg-white/10 rounded flex flex-row items-center justify-between"
						onDblClick={(e) => {
							e.preventDefault();
							e.stopPropagation();

							setEditing(true);
						}}
					>
						<button
							type="button"
							class="py-0.5 px-1.5 w-full text-left"
							onClick={() => props.onClick()}
						>
							{props.graph.name}
						</button>
						<button
							type="button"
							class="pointer-events-none opacity-0 focus:opacity-100"
							onClick={() => {
								setEditing(true);
							}}
						>
							<IconAntDesignEditOutlined class="size-4" />
						</button>
					</span>

					<DeleteButton graph={props.graph} />
				</Match>
			</Switch>
		</li>
	);
}

const DeleteButton = (props: { graph: Graph }) => {
	const core = useCore();

	function deleteGraph() {
		core.project.graphs.delete(props.graph.id);
		props.graph.dispose();
		core.project.save();
	}

	return (
		<Dialog.Root>
			<Dialog.Trigger
				class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 hover:bg-white/10 rounded p-0.5"
				onClick={(e) => {
					if (!e.shiftKey) return;

					// don't open the dialog if shift is pressed
					e.preventDefault();
					// don't want parent handlers to fire
					e.stopPropagation();

					deleteGraph();
				}}
				as="button"
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
