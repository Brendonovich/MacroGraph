import { For } from "solid-js";

import { ProjectActions } from "../Actions";
import { useProjectService } from "../EffectRuntime";
import { useLayoutStateRaw } from "../LayoutState";
import { ProjectState } from "../State";

export function GraphsSidebar() {
	const { state } = useProjectService(ProjectState);
	const actions = useProjectService(ProjectActions);
	const layoutState = useLayoutStateRaw();

	const selected = () => {
		const s = layoutState.focusedTab();
		if (s?.type === "graph") return s.graphId;
	};

	return (
		<>
			<div class="h-8 flex flex-row">
				<input
					class="h-full flex-1 px-2 bg-gray-3 dark:bg-gray-2 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
					placeholder="Search Graphs"
					disabled
				/>
				<button
					type="button"
					class="bg-transparent h-full disabled:(text-gray-10) px-2 not-disabled:hover:bg-gray-3 focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
					onClick={() => actions.CreateGraph()}
				>
					New
				</button>
			</div>
			<ul>
				<For each={Object.values(state.graphs)}>
					{(graph) => (
						<li>
							<button
								type="button"
								class="w-full data-[selected='true']:bg-gray-2 hover:bg-gray-2 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
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
