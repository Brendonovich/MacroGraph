import {
	type Graph,
	type Node,
	Package,
} from "@macrograph/project-domain/updated";
import { PaneLayout, TabLayout } from "@macrograph/ui";
import { createWritableMemo } from "@solid-primitives/memo";
import { isMobile } from "@solid-primitives/platform";
import "@total-typescript/ts-reset";
import { identity } from "effect";
import { createContextProvider } from "@solid-primitives/context";
import { type Accessor, batch, createMemo, createSignal } from "solid-js";
import {
	createStore,
	produce,
	reconcile,
	type StoreSetter,
	unwrap,
} from "solid-js/store";

export namespace TabState {
	export type TabState =
		| {
				type: "graph";
				graphId: Graph.Id;
				selection: Graph.ItemRef[];
				transform?: { translate: { x: number; y: number }; zoom: number };
		  }
		| { type: "package"; packageId: Package.Id }
		| { type: "settings"; page: "Credentials" };

	export const isGraph = (
		self: TabState,
	): self is Extract<TabState, { type: "graph" }> => self.type === "graph";

	export const getKey = (state: TabState) => {
		switch (state.type) {
			case "graph":
				return `graph-${state.graphId}`;
			case "package":
				return `package-${state.packageId}`;
			case "settings":
				return "settings";
		}
	};
}

export type PaneState = {
	id: number;
	selectedTab: number;
	tabs: Array<TabState.TabState & { tabId: number }>;
};

export function createSelectedSidebarState<T extends string>(
	get: Accessor<T | null>,
	dfault: T,
) {
	const [state, setState] = createWritableMemo<T | null>(
		(v) => {
			if (v === null) return null;
			return get() ?? v;
		},
		isMobile ? null : get(),
	);

	const lastState = createMemo<T>((v) => {
		return state() ?? v;
	}, dfault);

	function toggle(value?: T | boolean) {
		setState((s) => {
			if (typeof value === "boolean") {
				if (value) return lastState();
				else return null;
			}

			if (typeof value === "string") {
				if (s === value) return null;
				return value;
			}

			if (s) return null;
			return lastState();
		});
	}

	function setOpen(open: boolean) {
		setState(() => (open ? lastState() : null));
	}

	return { setOpen, toggle, state };
}

type IdentityFn<T> = (t: T) => T;

export function createContextualSidebarState(opts?: {
	wrapOpenSignal?: IdentityFn<ReturnType<typeof createSignal<boolean>>>;
}) {
	const { focusedPane } = useLayoutState();

	const state = createMemo<
		| null
		| { type: "graph"; graph: Graph.Id }
		| { type: "node"; graph: Graph.Id; node: Node.Id }
	>((v) => {
		const prevRet = null;
		const pane = focusedPane();
		if (!pane) return prevRet;
		const tab = pane.tabs.find((t) => t.tabId === pane.selectedTab);
		if (tab?.tabId !== pane.selectedTab) return prevRet;
		if (tab.type !== "graph") return prevRet;
		if (tab.selection.length < 1) return { type: "graph", graph: tab.graphId };
		if (tab.selection.length === 1 && tab.selection[0]?.[0] === "Node")
			return { type: "node", graph: tab.graphId, node: tab.selection[0][1] };
		return prevRet;
	}, null);

	const [open, setOpen] = (opts?.wrapOpenSignal ?? identity)(
		createSignal(!isMobile),
	);

	return { state, open, setOpen };
}

export function createLayoutState(opts?: {
	wrapPanesStore?: IdentityFn<
		ReturnType<typeof createStore<Record<number, PaneState>>>
	>;
	wrapPaneLayoutStore?: IdentityFn<
		ReturnType<
			typeof createStore<PaneLayout.PaneLayout<number> | PaneLayout.Empty>
		>
	>;
}) {
	const [panes, setPanes] = (opts?.wrapPanesStore ?? identity)(
		createStore<Record<number, PaneState>>({
			0: {
				id: 0,
				selectedTab: 0,
				tabs: [{ tabId: 0, type: "settings", page: "Credentials" }],
			},
			1: {
				id: 1,
				selectedTab: 0,
				tabs: [
					{
						tabId: 0,
						type: "package",
						packageId: Package.Id.make("twitch"),
					},
				],
			},
		}),
	);

	const [paneLayout, setPaneLayout] = (opts?.wrapPaneLayoutStore ?? identity)(
		createStore<PaneLayout.PaneLayout<number> | PaneLayout.Empty>({
			variant: "horizontal",
			panes: [
				{ size: 0.5, variant: "single", pane: 0 },
				{ size: 0.5, variant: "single", pane: 1 },
			],
		}),
	);

	return { panes, setPanes, paneLayout, setPaneLayout };
}

const [LayoutStateProvider, _useLayoutState] = createContextProvider(
	({
		panes,
		setPanes,
		paneLayout,
		setPaneLayout,
	}: ReturnType<typeof createLayoutState>) => {
		// this really needs improving
		function removePane(id: number) {
			batch(() => {
				setPaneLayout((paneLayout) => PaneLayout.removePane(paneLayout, id));
				setPanes(id, undefined!);
			});
		}

		function openTab(data: TabState.TabState) {
			batch(() => {
				const paneIds = Object.keys(panes);

				if (paneIds.length === 0) {
					const id = Math.random();
					setPanes(
						id,
						reconcile<PaneState, PaneState>({
							id,
							selectedTab: 0,
							tabs: [{ tabId: 0, ...data }],
						}),
					);
					setPaneLayout(
						reconcile({
							variant: "single",
							pane: id,
						}),
					);
					return;
				}

				const paneId = focusedPaneId();
				if (paneId === null) return;

				setPanes(
					paneId,
					produce((pane) => {
						const existing = pane.tabs.find(
							(s) => TabState.getKey(s) === TabState.getKey(data),
						);
						if (existing) {
							pane.selectedTab = existing.tabId;
						} else {
							const tabId = Math.random();
							pane.tabs.push({ ...data, tabId });
							pane.selectedTab = tabId;
						}
					}),
				);
			});
		}

		const [focusedPaneId, setFocusedPaneId] = createWritableMemo<number | null>(
			(v) => {
				const panesIds = Object.keys(panes);
				if (panesIds.length === 0) return null;
				if (typeof v === "number" && panesIds.includes(v?.toString())) return v;
				const id = panesIds[0] ?? null;
				if (id) return Number(id);
				return null;
			},
		);

		const focusedPane = () => {
			const id = focusedPaneId();
			if (id === null) return;
			return panes[id];
		};

		const focusedTab = () => {
			const pane = focusedPane();
			if (!pane) return;
			return pane.tabs.find((t) => t.tabId === pane.selectedTab);
		};

		const [zoomedPane, setZoomedPane] = createSignal<null | number>(null);

		function removeTab(paneId: number, tabId: number) {
			const pane = panes[paneId];
			if (!pane) return;

			batch(() => {
				setPanes(
					paneId,
					produce((pane) => TabLayout.removeTab(pane, tabId)),
				);
				if (pane.tabs.length < 1) removePane(paneId);
			});
		}

		function splitPane(paneId: number, direction: "horizontal" | "vertical") {
			const pane = panes[paneId];
			if (!pane) return;

			const newId = Math.random();

			let success = false;
			batch(() => {
				setPaneLayout((paneLayout) =>
					PaneLayout.splitPane(paneLayout, direction, paneId, newId, () => {
						success = true;
					}),
				);
				if (success) {
					setFocusedPaneId(newId);
					setPanes(newId, {
						...structuredClone(unwrap(pane)),
						tabs: structuredClone(
							pane.tabs
								.filter((t) => t.tabId === pane.selectedTab)
								.map((v) => unwrap(v)),
						),
						id: newId,
					});
				}
			});
		}

		function setSelectedTab(paneId: number, tabId: number) {
			setPanes(paneId, "selectedTab", tabId);
		}

		function updateTab(
			paneId: number,
			tabId: number,
			setter: StoreSetter<TabState.TabState, any>,
		) {
			setPanes(paneId, "tabs", (tab) => tab.tabId === tabId, setter);
		}

		function toggleZoomedPane(pane?: number) {
			if (pane === undefined) {
				setZoomedPane(null);
			} else {
				setZoomedPane((p) => (p === pane ? null : pane));
			}
		}

		return {
			openTab,
			removeTab,
			splitPane,
			zoomedPane,
			toggleZoomedPane,
			paneLayout,
			focusedPaneId,
			setFocusedPaneId,
			focusedPane,
			focusedTab,
			panes,
			setSelectedTab,
			updateTab,
		};
	},
);

export const useLayoutState = () => {
	const ctx = _useLayoutState();
	if (!ctx)
		throw new Error("useLayoutState must be used within a LayoutStateProvider");
	return ctx;
};

export { LayoutStateProvider };
