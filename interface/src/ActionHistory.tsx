import { For, Show } from "solid-js";
import { useInterfaceContext } from "./context";

export function ActionHistory() {
	const ctx = useInterfaceContext();

	return (
		<ul class="absolute rounded top-4 right-4 bg-neutral-900 max-w-64 w-full p-2 flex flex-col">
			<For
				each={ctx.history}
				fallback={
					<span class="w-full text-center text-neutral-300 text-sm">
						No History
					</span>
				}
			>
				{(entry, i) => (
					<div class="pl-4 py-0.5 relative">
						<div class="w-4 absolute inset-y-0 left-0 flex items-center justify-center">
							<Show when={ctx.nextHistoryIndex() - 1 === i()}>
								<IconMaterialSymbolsArrowRightRounded class="w-6 h-6 -m-1" />
							</Show>
						</div>

						<For each={entry}>
							{(e) => (
								<li
									class="flex flex-row items-center"
									classList={{
										"border-l-2 border-neutral-800 pl-2": entry.length > 1,
									}}
								>
									{e.type}
								</li>
							)}
						</For>
					</div>
				)}
			</For>
		</ul>
	);
}
