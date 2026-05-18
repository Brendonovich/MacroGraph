import { createSignal } from "solid-js";

import type { TabState } from "./components/Graph/Context";
import type { TabDropTarget } from "./mosaicLayout";

export type TabDragSession = {
	tab: TabState;
	label: string;
	sourceGroupId: string;
	sourceIndex: number;
	duplicate: boolean;
};

const [tabDragSession, setTabDragSession] =
	createSignal<TabDragSession | null>(null);
const [tabDragGhostPos, setTabDragGhostPos] = createSignal({ x: 0, y: 0 });
const [tabDropTarget, setTabDropTarget] = createSignal<TabDropTarget | null>(
	null,
);

export function getTabDragSession() {
	return tabDragSession();
}

export function getTabDragGhostPos() {
	return tabDragGhostPos();
}

export function getTabDropTarget() {
	return tabDropTarget();
}

export function startTabDragSession(session: TabDragSession) {
	setTabDragSession(session);
}

export function updateTabDragGhost(x: number, y: number) {
	setTabDragGhostPos({ x, y });
}

export function updateTabDropTarget(target: TabDropTarget | null) {
	setTabDropTarget(target);
}

export function endTabDragSession() {
	setTabDragSession(null);
	setTabDropTarget(null);
}
