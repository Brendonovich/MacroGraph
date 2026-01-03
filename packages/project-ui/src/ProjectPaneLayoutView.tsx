import { PaneLayoutView, type TabLayout } from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { type Accessor, createSignal, Show } from "solid-js";

import {
	type PaneState,
	type TabState,
	useLayoutStateRaw,
} from "./LayoutState";
import { ProjectPaneTabView } from "./ProjectPaneTabView";

export function ProjectPaneLayoutView<TSettingsPage extends string>(props: {
	makeTabController: (
		pane: Accessor<PaneState<TSettingsPage>>,
	) => TabLayout.Controller<TabState.TabState & { tabId: number }>;
}) {
	const layoutState = useLayoutStateRaw<TSettingsPage>();

	return (
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
	);
}
