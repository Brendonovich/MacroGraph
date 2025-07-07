import type { Graph } from "@macrograph/runtime";

import { For } from "solid-js";
import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";

export function Outline(props: { graph: Graph }) {
	const interfaceCtx = useInterfaceContext();

	return (
		<SidebarSection title="Outline">
			<label class="text-neutral-300 font-medium pl-2 py-1 text-xs shadow">
				Comment Boxes
			</label>
			<ul class="flex flex-col overflow-y-auto p-1">
				<For each={[...props.graph.commentBoxes.values()]}>
					{(box) => (
						<li>
							<button
								class="text-left w-full px-1 py-0.5 rounded hover:bg-white/10"
								type="button"
								onClick={() => {
									interfaceCtx.execute("setGraphSelection", {
										graphId: props.graph.id,
										selection: [{ type: "commentBox", id: box.id }],
									});
									// interfaceCtx.setGraphStates(
									// 	produce((states) => {
									// 		const state = states.find((s) => s.id === props.graph.id);
									// 		if (!state) return;

									// 		state.translate = {
									// 			x:
									// 				box.position.x +
									// 				box.size.x / 2 -
									// 				interfaceCtx.graphBounds.width / 2,
									// 			y:
									// 				box.position.y +
									// 				box.size.y / 2 -
									// 				interfaceCtx.graphBounds.height / 2,
									// 		};
									// 	}),
									// );
								}}
							>
								{box.text}
							</button>
						</li>
					)}
				</For>
			</ul>
		</SidebarSection>
	);
}
