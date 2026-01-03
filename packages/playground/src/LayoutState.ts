import { createTypedLayoutState } from "@macrograph/project-ui";

export type SettingsPage = "credentials";

export const { LayoutStateProvider, useLayoutState, createLayoutState } =
	createTypedLayoutState<SettingsPage>();
