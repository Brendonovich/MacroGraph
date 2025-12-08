import {
	type TabLayout,
	TabLayoutActions,
	TabLayoutView,
} from "@macrograph/ui";
import type { ComponentProps } from "solid-js";

import {
	type PaneState,
	type TabState,
	useLayoutStateRaw,
} from "./LayoutState";

export function ProjectPaneTabView(
	props: Pick<ComponentProps<typeof TabLayoutView>, "ref"> & {
		controller: TabLayout.Controller<TabState.TabState & { tabId: number }>;
		pane: PaneState;
	},
) {
	const layoutState = useLayoutStateRaw();

	return (
		<TabLayoutView
			ref={props.ref}
			{...props.controller}
			selectedTabId={props.pane.selectedTab}
			onSelectedChange={(id) => layoutState.setSelectedTab(props.pane.id, id)}
			onRemove={(id) => layoutState.removeTab(props.pane.id, id)}
			focused={layoutState.focusedPaneId() === props.pane.id}
			focusActions={
				<TabLayoutActions
					onSplit={(dir) => layoutState.splitPane(props.pane.id, dir)}
					onZoom={() => layoutState.toggleZoomedPane(props.pane.id)}
					zoomed={layoutState.zoomedPane() === props.pane.id}
				/>
			}
		/>
	);
}
