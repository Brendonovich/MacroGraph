import { createTypedLayoutState } from "@macrograph/project-ui";

export type SettingsPage = "credentials" | "server";

const { LayoutStateProvider, useLayoutState, createLayoutState } =
	createTypedLayoutState<SettingsPage>();

export { LayoutStateProvider, useLayoutState, createLayoutState };
