import { focusRingClasses } from "@macrograph/ui";
import { cx } from "cva";
import { createMemo, createSignal, For } from "solid-js";

import { ProjectActions } from "../Actions";
import { useProjectService } from "../EffectRuntime";
import { useLayoutStateRaw } from "../LayoutState";
import { ProjectState } from "../State";
import { tokeniseString } from "./search";

export function GraphsSidebar() {
	const { state } = useProjectService(ProjectState);
	const actions = useProjectService(ProjectActions);
	const layoutState = useLayoutStateRaw();

	const [search, setSearch] = createSignal("");

	const tokenisedGraphs = createMemo(() =>
		Object.values(state.graphs).map(
			(graph) => [tokeniseString(graph.name), graph] as const,
		),
	);

	const filteredGraphs = createMemo(() => {
		const searchTokens = tokeniseString(search());
		if (searchTokens.length === 0) return tokenisedGraphs();
		return tokenisedGraphs().filter(([tokens]) =>
			searchTokens.every((token) => tokens.some((t) => t.includes(token))),
		);
	});

	const selected = () => {
		const s = layoutState.focusedTab();
		if (s?.type === "graph") return s.graphId;
	};

	return (
		<>
			<div class="h-8 flex flex-row">
				<div class="h-full flex-1">
					<input
						class={cx(
							"w-full h-full px-2 bg-gray-3 dark:bg-gray-2",
							focusRingClasses("inset"),
						)}
						placeholder="Search Graphs"
						value={search()}
						onInput={(e) => setSearch(e.currentTarget.value)}
					/>
				</div>
				<button
					type="button"
					class={cx(
						"bg-transparent h-full disabled:text-gray-10 px-2 not-disabled:hover:bg-gray-3 shrink-0",
						focusRingClasses("inset"),
					)}
					onClick={() => actions.CreateGraph()}
				>
					New
				</button>
			</div>
			<ul>
				<For each={filteredGraphs()}>
					{([, graph]) => (
						<li>
							<button
								type="button"
								class={cx(
									"w-full data-[selected='true']:bg-gray-2 hover:bg-gray-2 px-2 p-1 text-left bg-transparent",
									focusRingClasses("inset"),
								)}
								data-selected={selected() === graph.id}
								onClick={() =>
									layoutState.openTab({
										type: "graph",
										graphId: graph.id,
										selection: [],
									})
								}
							>
								{graph.name}
							</button>
						</li>
					)}
				</For>
			</ul>
		</>
	);
}
