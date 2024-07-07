import { createMarker, makeSearchRegex } from "@solid-primitives/marker";
import { For, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useCore } from "../../contexts";
import { filterWithTokenisedSearch, tokeniseString } from "../../util";
import { SearchInput } from "../SearchInput";

export function PrintOutput() {
	const [items, setItems] = createSignal<{ value: string; timestamp: Date }[]>(
		[],
	);
	const [search, setSearch] = createSignal("");
	const core = useCore();

	onMount(() => {
		const unsub = core.printSubscribe((value) =>
			setItems((i) => [{ value, timestamp: new Date() }, ...i]),
		);

		onCleanup(unsub);
	});

	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	const searchRegex = createMemo(() => makeSearchRegex(search()));
	const highlight = createMarker((text) => (
		<mark class="bg-yellow-500">{text()}</mark>
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
				<button
					type="button"
					class="hover:bg-white/10 rounded transition-colors p-0.5"
					onClick={(e) => {
						e.stopPropagation();
						setItems([]);
					}}
				>
					<IconAntDesignDeleteOutlined class="size-4" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto">
				<ul class="p-1 gap-y-2 flex flex-col">
					<For each={filteredItems()}>
						{(e) => (
							<li class="px-2 py-2 rounded-md bg-black/30">
								<p class="text-neutral-400 text-xs">
									{e.timestamp.toLocaleTimeString()}
								</p>
								<p class="text-neutral-100 text-sm break-words">
									{highlight(e.value, searchRegex())}
								</p>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
