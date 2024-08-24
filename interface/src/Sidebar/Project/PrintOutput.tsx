import type { PrintItem } from "@macrograph/runtime";
import { createMarker, makeSearchRegex } from "@solid-primitives/marker";
import { For, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { produce } from "solid-js/store";
import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { filterWithTokenisedSearch, tokeniseString } from "../../util";
import { SearchInput } from "../SearchInput";

export function PrintOutput() {
	const [items, setItems] = createSignal<PrintItem[]>([]);
	const [search, setSearch] = createSignal("");
	const interfaceCtx = useInterfaceContext();

	onMount(() => {
		const unsub = interfaceCtx.core.printSubscribe((value) =>
			setItems((i) => [value, ...i]),
		);

		onCleanup(unsub);
	});

	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	const searchRegex = createMemo(() => makeSearchRegex(search()));
	const highlight = createMarker((text) => (
		<mark class="bg-mg-focus">{text()}</mark>
	));

	const tokenisedItems = createMemo(() =>
		items().map((i) => [tokeniseString(i.value), i] as const),
	);

	const filteredItems = createMemo(() =>
		filterWithTokenisedSearch(tokenisedSearch, tokenisedItems()),
	);

	return (
		<SidebarSection title="Print Output">
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

			<div class="flex-1 overflow-y-auto">
				<ul class="p-1 gap-y-2 flex flex-col">
					<For each={filteredItems()}>
						{(i) => {
							const graph = createMemo(() =>
								interfaceCtx.core.project.graph(i.graph.id),
							);

							const node = createMemo(() => graph()?.node(i.node.id));

							return (
								<li class="px-2 py-2 rounded-md bg-black/30">
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
												interfaceCtx.setGraphStates(
													produce((states) => {
														const state = states.find((s) => s.id === g.id);
														if (!state) return;
														const size = interfaceCtx.itemSizes.get(n);
														if (!size) return;

														state.translate = {
															x:
																n.state.position.x +
																size.width / 2 -
																interfaceCtx.graphBounds.width / 2,
															y:
																n.state.position.y +
																size.height / 2 -
																interfaceCtx.graphBounds.height / 2,
														};
													}),
												);
											}}
											disabled={!node()}
										>
											{`${graph()?.name ?? i.graph.name} · ${
												node()?.state.name ?? i.node.name
											}`}
										</button>
										<p>{i.timestamp.toLocaleTimeString()}</p>
									</div>
									<p class="text-neutral-100 text-sm break-words">
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
