import { createEventListener } from "@solid-primitives/event-listener";

import { useContextualSidebar } from "./ContextualSidebar/Context";
import { useLayoutStateRaw } from "./LayoutState";
import { useNavSidebar } from "./NavSidebar";

export function useEditorKeybinds() {
	const layoutState = useLayoutStateRaw();
	const navSidebar = useNavSidebar();
	const contextualSidebar = useContextualSidebar();

	createEventListener(window, "keydown", (e) => {
		if (e.code === "KeyB" && e.metaKey) {
			e.preventDefault();
			navSidebar.toggle();
		} else if (e.code === "KeyR" && e.metaKey) {
			e.preventDefault();
			contextualSidebar.setOpen((o) => !o);
		} else if (e.code === "Escape" && e.shiftKey) {
			layoutState.toggleZoomedPane(layoutState.focusedPaneId() ?? undefined);
		} else if (e.code === "ArrowLeft" && e.metaKey) {
			if (layoutState.moveSelectedTab(-1)) e.preventDefault();
		} else if (e.code === "ArrowRight" && e.metaKey) {
			if (layoutState.moveSelectedTab(1)) e.preventDefault();
		} else if (e.code === "KeyW" && e.ctrlKey) {
			const pane = layoutState.focusedPane();
			if (pane === undefined) return;
			layoutState.removeTab(pane.id, pane.selectedTab);
			e.preventDefault();
		} else if (e.code === "Backslash" && e.metaKey) {
			const paneId = layoutState.focusedPaneId();
			if (typeof paneId !== "number") return;
			layoutState.splitPane(paneId, "horizontal");
			e.preventDefault();
		}
	});
}
