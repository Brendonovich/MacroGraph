import {
	createLayoutState as _,
	createLayoutStateContext,
	createTypedLayoutState,
	PaneState,
} from "@macrograph/project-ui";

export type SettingsPage = "credentials";

export const { LayoutStateProvider, useLayoutState, createLayoutState } =
	createTypedLayoutState<SettingsPage>();
