import type { SetStoreFunction } from "solid-js/store";
import { reconcile } from "solid-js/store";

import type { TabState } from "./components/Graph/Context";

export type MosaicLeaf = { type: "leaf"; groupId: string };
export type MosaicSplit = {
	type: "split";
	direction: "horizontal" | "vertical";
	ratio: number;
	first: MosaicNode;
	second: MosaicNode;
};
export type MosaicNode = MosaicLeaf | MosaicSplit;

export type TabListState = {
	id: string;
	tabs: TabState[];
	selectedIndex: number;
	selectedTabKey?: string;
};

export type MosaicWorkspaceState = {
	version: 2;
	root: MosaicNode;
	groups: TabListState[];
	focusedGroupId: string;
};

function tabKey(tab: TabState) {
	if (tab.type === "graph") return `${tab.graphKind}:${tab.graphId}`;
	if (tab.type === "function") return `function:${tab.functionId}`;
	if (tab.type === "queue") return `queue:${tab.queueId}`;
	if (tab.type === "functionQueue") return `functionQueue:${tab.functionQueueId}`;
	if (tab.type === "package") return `package:${tab.packageName}`;
	return tab.type;
}

export type SplitDirection = "horizontal" | "vertical";
export type SplitEdge = "left" | "right" | "top" | "bottom";

export type TabDropTarget = {
	kind: "tabBar" | "content";
	groupId: string;
	insertIndex?: number;
	edge?: SplitEdge;
};

export type TabDragDropInput = {
	tab: TabState;
	sourceGroupId: string;
	sourceIndex: number;
	duplicate: boolean;
	dropTarget: TabDropTarget | null;
};

const MIN_RATIO = 0.15;
const MAX_RATIO = 0.85;
const DEFAULT_RATIO = 0.5;

export function createGroupId(): string {
	return crypto.randomUUID();
}

export function createLeafGroup(): TabListState {
	return {
		id: createGroupId(),
		tabs: [],
		selectedIndex: 0,
	};
}

export function findGroupIndex(
	groups: TabListState[],
	groupId: string,
): number {
	return groups.findIndex((g) => g.id === groupId);
}

export function getGroupById(
	groups: TabListState[],
	groupId: string,
): TabListState | undefined {
	return groups.find((g) => g.id === groupId);
}

export function leafNode(groupId: string): MosaicNode {
	return { type: "leaf", groupId };
}

export function horizontalSplitChain(groupIds: string[]): MosaicNode {
	if (groupIds.length === 0) {
		const g = createLeafGroup();
		return leafNode(g.id);
	}
	if (groupIds.length === 1) return leafNode(groupIds[0]);
	let node: MosaicNode = leafNode(groupIds[groupIds.length - 1]!);
	for (let i = groupIds.length - 2; i >= 0; i--) {
		node = {
			type: "split",
			direction: "horizontal",
			ratio: DEFAULT_RATIO,
			first: leafNode(groupIds[i]!),
			second: node,
		};
	}
	return node;
}

/** Keep root leaf ids, groups, and focus in sync (handles hydrate race + v2 load without group ids). */
export function ensureMosaicConsistency(
	state: MosaicWorkspaceState,
): MosaicWorkspaceState {
	const groupIds = state.groups.map((g) => g.id);
	if (!groupIds.length) {
		const g = createLeafGroup();
		return {
			version: 2,
			root: leafNode(g.id),
			groups: [g],
			focusedGroupId: g.id,
		};
	}

	const rootIds = collectLeafGroupIds(state.root);
	const rootSet = new Set(rootIds);
	const groupSet = new Set(groupIds);
	const layoutMatches =
		rootIds.length === groupIds.length &&
		groupIds.every((id) => rootSet.has(id));

	const root = layoutMatches
		? state.root
		: groupIds.length <= 1
			? leafNode(groupIds[0]!)
			: horizontalSplitChain(groupIds);

	const focusedGroupId = groupSet.has(state.focusedGroupId)
		? state.focusedGroupId
		: groupIds[0]!;

	if (
		layoutMatches &&
		focusedGroupId === state.focusedGroupId &&
		root === state.root
	) {
		return state;
	}

	return { ...state, root, focusedGroupId };
}

export function migrateGroupsToV2(
	groups: Array<Omit<TabListState, "id"> & { id?: string }>,
	focusedIndex: number,
): MosaicWorkspaceState {
	const withIds = groups.map((g) => ({
		...g,
		id: g.id ?? createGroupId(),
	}));
	const groupIds = withIds.map((g) => g.id);
	const focusedGroupId =
		withIds[Math.min(Math.max(0, focusedIndex), withIds.length - 1)]?.id ??
		withIds[0]!.id;
	return ensureMosaicConsistency({
		version: 2,
		root:
			groupIds.length <= 1
				? leafNode(groupIds[0] ?? createGroupId())
				: horizontalSplitChain(groupIds),
		groups: withIds,
		focusedGroupId,
	});
}

/** Stable key so MosaicLayout remounts when the split tree shape changes. */
export function mosaicLayoutKey(root: MosaicNode): string {
	return collectLeafGroupIds(root).join("|");
}

/** Replace full mosaic store (merge:false so leaf→split tree updates apply immediately). */
export function setMosaicWorkspaceState(
	setMosaicState: SetStoreFunction<MosaicWorkspaceState>,
	next: MosaicWorkspaceState,
) {
	const normalized = ensureMosaicConsistency(next);
	setMosaicState(reconcile(normalized, { merge: false }));
}

export function collectLeafGroupIds(node: MosaicNode): string[] {
	if (node.type === "leaf") return [node.groupId];
	return [
		...collectLeafGroupIds(node.first),
		...collectLeafGroupIds(node.second),
	];
}

export function walkLeavesInOrder(
	node: MosaicNode,
	visit: (groupId: string) => void,
) {
	if (node.type === "leaf") {
		visit(node.groupId);
		return;
	}
	walkLeavesInOrder(node.first, visit);
	walkLeavesInOrder(node.second, visit);
}

export function getLeafOrder(state: MosaicWorkspaceState): string[] {
	const ids: string[] = [];
	walkLeavesInOrder(state.root, (id) => ids.push(id));
	return ids;
}

export function clampRatio(ratio: number): number {
	return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

export function splitLeaf(
	root: MosaicNode,
	targetGroupId: string,
	direction: SplitDirection,
	newGroupId: string,
	placeNewFirst: boolean,
): MosaicNode {
	const newLeaf = leafNode(newGroupId);
	function walk(node: MosaicNode): MosaicNode {
		if (node.type === "leaf") {
			if (node.groupId !== targetGroupId) return node;
			return {
				type: "split",
				direction,
				ratio: DEFAULT_RATIO,
				first: placeNewFirst ? newLeaf : node,
				second: placeNewFirst ? node : newLeaf,
			};
		}
		return {
			...node,
			first: walk(node.first),
			second: walk(node.second),
		};
	}
	return walk(root);
}

export function removeLeaf(
	root: MosaicNode,
	groupId: string,
): MosaicNode | null {
	function walk(node: MosaicNode): MosaicNode | null {
		if (node.type === "leaf") {
			return node.groupId === groupId ? null : node;
		}
		const first = walk(node.first);
		const second = walk(node.second);
		if (first === null && second === null) return null;
		if (first === null) return second;
		if (second === null) return first;
		return { ...node, first, second };
	}
	return walk(root);
}

/** Update `ratio` on the split at `path` (path = indices from root to that split, [] = root). */
export function updateSplitRatio(
	root: MosaicNode,
	path: number[],
	ratio: number,
): MosaicNode {
	if (root.type === "leaf") return root;
	if (path.length === 0) {
		return { ...root, ratio: clampRatio(ratio) };
	}
	const [head, ...rest] = path;
	if (head === 0) {
		return {
			...root,
			first: updateSplitRatio(root.first, rest, ratio),
		};
	}
	return {
		...root,
		second: updateSplitRatio(root.second, rest, ratio),
	};
}

/** In-place ratio update — avoids cloning the whole split tree on every resize frame. */
export function applySplitRatioAtPath(
	root: MosaicNode,
	path: number[],
	ratio: number,
): void {
	if (root.type === "leaf") return;
	if (path.length === 0) {
		root.ratio = clampRatio(ratio);
		return;
	}
	const [head, ...rest] = path;
	applySplitRatioAtPath(
		head === 0 ? root.first : root.second,
		rest,
		ratio,
	);
}

export function findSplitPath(
	node: MosaicNode,
	groupId: string,
	path: number[] = [],
): number[] | null {
	if (node.type === "leaf") {
		return node.groupId === groupId ? path : null;
	}
	return (
		findSplitPath(node.first, groupId, [...path, 0]) ??
		findSplitPath(node.second, groupId, [...path, 1])
	);
}

export function edgeToSplit(
	edge: SplitEdge,
): { direction: SplitDirection; placeNewFirst: boolean } {
	switch (edge) {
		case "left":
			return { direction: "horizontal", placeNewFirst: true };
		case "right":
			return { direction: "horizontal", placeNewFirst: false };
		case "top":
			return { direction: "vertical", placeNewFirst: true };
		case "bottom":
			return { direction: "vertical", placeNewFirst: false };
	}
}

export function selectedIndexAfterTabMove(
	from: number,
	to: number,
	selectedIndex: number,
): number {
	if (selectedIndex === from) return to;
	if (from < to && selectedIndex > from && selectedIndex <= to) {
		return selectedIndex - 1;
	}
	if (from > to && selectedIndex >= to && selectedIndex < from) {
		return selectedIndex + 1;
	}
	return selectedIndex;
}

export function moveTabInGroup(state: TabListState, from: number, to: number) {
	if (from === to || !state.tabs.length) return;
	const [moved] = state.tabs.splice(from, 1);
	state.tabs.splice(to, 0, moved);
	state.selectedIndex = selectedIndexAfterTabMove(
		from,
		to,
		state.selectedIndex,
	);
	const selected = state.tabs[state.selectedIndex];
	state.selectedTabKey = selected ? tabKey(selected) : undefined;
}

export function adjustSelectionAfterTabClose(
	state: TabListState,
	closedIndex: number,
) {
	if (!state.tabs.length) {
		state.selectedIndex = 0;
		state.selectedTabKey = undefined;
		return;
	}
	const wasSelected = state.selectedIndex === closedIndex;
	if (!wasSelected) {
		if (closedIndex < state.selectedIndex) {
			state.selectedIndex -= 1;
		}
		const selected = state.tabs[state.selectedIndex];
		state.selectedTabKey = selected ? tabKey(selected) : state.selectedTabKey;
		return;
	}
	const nextIndex = Math.min(closedIndex, state.tabs.length - 1);
	const selected = state.tabs[nextIndex];
	state.selectedIndex = nextIndex;
	state.selectedTabKey = selected ? tabKey(selected) : undefined;
}

/** Plain clone for store-backed mosaic/tab data (structuredClone fails on proxies). */
function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function cloneMosaicWorkspaceState(state: MosaicWorkspaceState): MosaicWorkspaceState {
	return cloneJson(state);
}

function cloneTab(tab: TabState): TabState {
	return cloneJson(tab);
}

export function applyTabDrop(
	state: MosaicWorkspaceState,
	input: TabDragDropInput,
): MosaicWorkspaceState {
	const { tab, sourceGroupId, sourceIndex, duplicate, dropTarget } = input;
	if (!dropTarget) return state;

	const sourceIdx = findGroupIndex(state.groups, sourceGroupId);
	if (sourceIdx < 0) return state;

	let next: MosaicWorkspaceState = cloneMosaicWorkspaceState(state);
	let tabToInsert: TabState = tab;
	let removeFromSource = !duplicate;

	const insertIntoGroup = (
		targetGroupId: string,
		insertIndex?: number,
	) => {
		const targetIdx = findGroupIndex(next.groups, targetGroupId);
		if (targetIdx < 0) return;
		const group = next.groups[targetIdx]!;
		const key = tabKey(tabToInsert);
		const existingIdx = group.tabs.findIndex((t) => tabKey(t) === key);
		if (existingIdx >= 0) {
			group.selectedIndex = existingIdx;
			group.selectedTabKey = key;
			tabToInsert = group.tabs[existingIdx]!;
			removeFromSource = removeFromSource && sourceGroupId !== targetGroupId;
			return;
		}
		const idx =
			insertIndex === undefined
				? group.tabs.length
				: Math.min(Math.max(0, insertIndex), group.tabs.length);
		group.tabs.splice(idx, 0, tabToInsert);
		group.selectedIndex = idx;
		group.selectedTabKey = key;
		next.focusedGroupId = targetGroupId;
	};

	if (dropTarget.edge) {
		const { direction, placeNewFirst } = edgeToSplit(dropTarget.edge);
		const newGroup = createLeafGroup();
		next.groups = [...next.groups, newGroup];
		next.root = splitLeaf(
			next.root,
			dropTarget.groupId,
			direction,
			newGroup.id,
			placeNewFirst,
		);
		insertIntoGroup(newGroup.id);
	} else {
		insertIntoGroup(dropTarget.groupId, dropTarget.insertIndex);
	}

	if (removeFromSource && sourceGroupId !== dropTarget.groupId) {
		const srcIdx = findGroupIndex(next.groups, sourceGroupId);
		if (srcIdx >= 0) {
			const src = next.groups[srcIdx]!;
			if (sourceIndex >= 0 && sourceIndex < src.tabs.length) {
				src.tabs.splice(sourceIndex, 1);
				adjustSelectionAfterTabClose(src, sourceIndex);
			}
			if (src.tabs.length === 0) {
				const collapsed = removeLeaf(next.root, sourceGroupId);
				if (collapsed) {
					next.root = collapsed;
				}
				next.groups = next.groups.filter((g) => g.id !== sourceGroupId);
				if (next.focusedGroupId === sourceGroupId) {
					const order = getLeafOrder(next);
					next.focusedGroupId =
						order[0] ?? next.groups[0]?.id ?? next.focusedGroupId;
				}
			}
		}
	} else if (!duplicate && dropTarget.groupId === sourceGroupId) {
		const srcIdx = findGroupIndex(next.groups, sourceGroupId);
		if (srcIdx >= 0) {
			const src = next.groups[srcIdx]!;
			const targetIdx =
				dropTarget.insertIndex ?? src.tabs.length - 1;
			const from = sourceIndex;
			let to = targetIdx;
			if (to > from) to -= 1;
			if (from !== to) moveTabInGroup(src, from, to);
		}
	}

	const layoutIds = new Set(collectLeafGroupIds(next.root));
	next.groups = next.groups.filter((g) => layoutIds.has(g.id));
	if (!layoutIds.has(next.focusedGroupId) && next.groups[0]) {
		next.focusedGroupId = next.groups[0].id;
	}

	return ensureMosaicConsistency(next);
}

export function splitFocusedGroup(
	state: MosaicWorkspaceState,
	direction: SplitDirection,
): MosaicWorkspaceState {
	const focusedId = state.focusedGroupId;
	const newGroup = createLeafGroup();
	const cloned = cloneMosaicWorkspaceState(state);
	let next: MosaicWorkspaceState = {
		...cloned,
		groups: [...cloned.groups, newGroup],
		focusedGroupId: newGroup.id,
	};
	next.root = splitLeaf(next.root, focusedId, direction, newGroup.id, false);
	return next;
}

/** Close a tab; removes the pane too when that was the last tab (if other panes exist). */
export function closeTabInGroup(
	state: MosaicWorkspaceState,
	groupId: string,
	tabIndex: number,
): MosaicWorkspaceState {
	const gi = findGroupIndex(state.groups, groupId);
	if (gi < 0) return state;
	const group = state.groups[gi]!;
	const paneCount = collectLeafGroupIds(state.root).length;

	if (group.tabs.length <= 1) {
		if (paneCount > 1) {
			return closeGroup(state, groupId);
		}
		const next = cloneMosaicWorkspaceState(state);
		const g = next.groups[gi]!;
		g.tabs = [];
		g.selectedIndex = 0;
		g.selectedTabKey = undefined;
		return ensureMosaicConsistency(next);
	}

	const next = cloneMosaicWorkspaceState(state);
	const g = next.groups[gi]!;
	g.tabs.splice(tabIndex, 1);
	adjustSelectionAfterTabClose(g, tabIndex);
	return ensureMosaicConsistency(next);
}

export function closeGroup(
	state: MosaicWorkspaceState,
	groupId: string,
): MosaicWorkspaceState {
	if (collectLeafGroupIds(state.root).length <= 1) {
		const g = state.groups.find((x) => x.id === groupId) ?? createLeafGroup();
		return {
			...state,
			root: leafNode(g.id),
			groups: [{ ...g, tabs: [], selectedIndex: 0, selectedTabKey: undefined }],
			focusedGroupId: g.id,
		};
	}
	const nextRoot = removeLeaf(state.root, groupId);
	if (!nextRoot) {
		const g = state.groups.find((x) => x.id !== groupId) ?? createLeafGroup();
		return ensureMosaicConsistency({
			...state,
			root: leafNode(g.id),
			groups: state.groups.filter((x) => x.id !== groupId),
			focusedGroupId: g.id,
		});
	}
	const layoutIds = new Set(collectLeafGroupIds(nextRoot));
	const groups = state.groups.filter((g) => layoutIds.has(g.id));
	const order = collectLeafGroupIds(nextRoot);
	let focusedGroupId = state.focusedGroupId;
	if (!layoutIds.has(focusedGroupId)) {
		focusedGroupId = order[0] ?? groups[0]?.id ?? focusedGroupId;
	}
	return ensureMosaicConsistency({
		...state,
		root: nextRoot,
		groups,
		focusedGroupId,
	});
}

export function focusAdjacentLeaf(
	state: MosaicWorkspaceState,
	delta: 1 | -1,
): MosaicWorkspaceState {
	const order = getLeafOrder(state);
	const idx = order.indexOf(state.focusedGroupId);
	if (idx < 0) return state;
	const nextIdx = (idx + delta + order.length) % order.length;
	return { ...state, focusedGroupId: order[nextIdx]! };
}

export function focusLeafByIndex(
	state: MosaicWorkspaceState,
	index: number,
): MosaicWorkspaceState {
	const order = getLeafOrder(state);
	const id = order[index];
	if (!id) return state;
	return { ...state, focusedGroupId: id };
}

export function duplicateTab(tab: TabState): TabState {
	return cloneTab(tab);
}

export const EDGE_ZONE_FRACTION = 0.2;

export function detectDropTarget(
	clientX: number,
	clientY: number,
	dragging: boolean,
): TabDropTarget | null {
	if (!dragging) return null;
	const panes = document.querySelectorAll<HTMLElement>("[data-mosaic-group-id]");
	for (const pane of panes) {
		const groupId = pane.dataset.mosaicGroupId;
		if (!groupId) continue;
		const rect = pane.getBoundingClientRect();
		if (
			clientX < rect.left ||
			clientX > rect.right ||
			clientY < rect.top ||
			clientY > rect.bottom
		) {
			continue;
		}

		const w = rect.width;
		const h = rect.height;
		const edgeW = w * EDGE_ZONE_FRACTION;
		const edgeH = h * EDGE_ZONE_FRACTION;

		if (clientX - rect.left < edgeW) {
			return { kind: "content", groupId, edge: "left" };
		}
		if (rect.right - clientX < edgeW) {
			return { kind: "content", groupId, edge: "right" };
		}
		if (clientY - rect.top < edgeH) {
			return { kind: "content", groupId, edge: "top" };
		}
		if (rect.bottom - clientY < edgeH) {
			return { kind: "content", groupId, edge: "bottom" };
		}

		const tabBar = pane.querySelector<HTMLElement>("[data-mosaic-tab-bar]");
		if (tabBar) {
			const tabEls = [
				...tabBar.querySelectorAll<HTMLElement>("[data-tab-index]"),
			];
			let insertIndex = tabEls.length;
			for (let i = 0; i < tabEls.length; i++) {
				const r = tabEls[i]!.getBoundingClientRect();
				if (clientX < r.left + r.width / 2) {
					insertIndex = Number(tabEls[i]!.dataset.tabIndex);
					break;
				}
			}
			return { kind: "tabBar", groupId, insertIndex };
		}

		return { kind: "content", groupId };
	}
	return null;
}
