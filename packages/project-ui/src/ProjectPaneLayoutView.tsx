import { PaneLayoutView, type TabLayout } from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { type Accessor, createSignal, Show } from "solid-js";

import { GraphContextMenu } from "./Graph/GraphContextMenu";
import { type PaneState, type TabState, useLayoutState } from "./LayoutState";
import { ProjectPaneTabView } from "./ProjectPaneTabView";

export function ProjectPaneLayoutView(props: {
	makeTabController: (
		pane: Accessor<PaneState>,
	) => TabLayout.Controller<TabState.TabState & { tabId: number }>;
}) {
	const layoutState = useLayoutState();

	return (
		<Show
			when={Object.keys(layoutState.paneLayout).length > 0}
			fallback={<div class="flex-1" />}
		>
			<GraphContextMenu.Provider>
				<PaneLayoutView state={layoutState.paneLayout}>
					{(paneId) => {
						const [ref, setRef] = createSignal<HTMLDivElement>();

						createEventListener(ref, "pointerdown", () => {
							layoutState.setFocusedPaneId(paneId());
						});

						return (
							<Show when={layoutState.panes[paneId()]}>
								{(pane) => (
									<Show
										when={pane().id !== layoutState.zoomedPane()}
										fallback={<div class="flex-1 bg-gray-4" />}
									>
										<ProjectPaneTabView
											ref={setRef}
											controller={props.makeTabController(pane)}
											pane={pane()}
										/>
									</Show>
								)}
							</Show>
						);
					}}
				</PaneLayoutView>
			</GraphContextMenu.Provider>
		</Show>
	);
}
