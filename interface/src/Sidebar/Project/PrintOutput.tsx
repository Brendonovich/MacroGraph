import type { PrintItem, PrintType } from "@macrograph/runtime";
import { createMarker, makeSearchRegex } from "@solid-primitives/marker";
import { For, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { filterWithTokenisedSearch, tokeniseString } from "../../util";
import { SearchInput } from "../SearchInput";

const typeStyles: Record<string, string> = {
	log: "",
	warn: "bg-orange-950/50",
	error: "bg-red-950/50",
};

const typeFilters: PrintType[] = ["log", "warn", "error"];

const typeLabels: Record<PrintType, string> = {
	log: "Logs",
	warn: "Warnings",
	error: "Errors",
};

export function Console() {
	const [items, setItems] = createSignal<PrintItem[]>([]);
	const [search, setSearch] = createSignal("");
	const [activeFilters, setActiveFilters] = createSignal<Set<PrintType>>(
		new Set(typeFilters),
	);
	const interfaceCtx = useInterfaceContext();

	onMount(() => {
		const unsub = interfaceCtx.core.printSubscribe((value) =>
			setItems((i) => [value, ...i]),
		);

		onCleanup(unsub);
	});

	function toggleFilter(type: PrintType) {
		setActiveFilters((prev) => {
			const next = new Set(prev);
			if (next.has(type)) next.delete(type);
			else next.add(type);
			return next;
		});
	}

	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	const searchRegex = createMemo(() => makeSearchRegex(search()));
	const highlight = createMarker((text) => (
		<mark class="bg-mg-focus">{text()}</mark>
	));

	const filteredByType = createMemo(() => {
		const active = activeFilters();
		return items().filter((i) => active.has(i.type));
	});

	const tokenisedItems = createMemo(() =>
		filteredByType().map((i) => [tokeniseString(i.value), i] as const),
	);

	const filteredItems = createMemo(() =>
		filterWithTokenisedSearch(tokenisedSearch, tokenisedItems()),
	);

	return (
		<SidebarSection title="Console">
			<div class="flex flex-col">
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
						class="p-0.5"
						onClick={(e) => {
							e.stopPropagation();
							setItems([]);
						}}
					>
						<IconAntDesignDeleteOutlined class="size-4" />
					</IconButton>
				</div>
				<div class="flex flex-row gap-1 p-1 border-b border-neutral-900">
					<For each={typeFilters}>
						{(type) => (
							<button
								type="button"
								class={`px-2 py-0.5 text-xs rounded ${
									activeFilters().has(type)
										? "bg-neutral-600 text-white"
										: "text-neutral-500 hover:text-neutral-200"
								}`}
								onClick={() => toggleFilter(type)}
							>
								{typeLabels[type]}
							</button>
						)}
					</For>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto">
				<ul class="p-1 gap-y-2 flex flex-col">
					<For each={filteredItems()}>
						{(i) => {
							const graph = createMemo(() =>
								interfaceCtx.core.project.getGraphByKind(
									i.graph.kind,
									i.graph.id,
								),
							);

							const node = createMemo(() => graph()?.node(i.node.id));

							return (
								<li class={`px-2 py-2 rounded-md ${typeStyles[i.type] || "bg-black/30"}`}>
									<div class="text-neutral-400 text-xs flex flex-row justify-between mb-1 gap-4">
										<button
											type="button"
											class="whitespace-nowrap overflow-hidden text-ellipsis flex-shrink hover:underline disabled:hover:no-underline"
											onClick={() => {
												const g = graph();
												if (!g) return;
												const n = node();
												if (!n) return;

												interfaceCtx.selectGraph(g);
												interfaceCtx.execute("setGraphSelection", {
													graphId: g.id,
													selection: [{ type: "node", id: n.id }],
												});
											}}
											disabled={!node()}
										>
											{`${graph()?.name ?? i.graph.name} · ${
												node()?.state.name ?? i.node.name
											}`}
										</button>
										<p>{i.timestamp.toLocaleTimeString()}</p>
									</div>
									<p class="text-sm break-words text-white">
										{highlight(i.value, searchRegex())}
									</p>
								</li>
							);
						}}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
