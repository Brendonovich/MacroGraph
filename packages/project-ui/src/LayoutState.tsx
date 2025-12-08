import type { Graph, Package } from "@macrograph/project-domain/updated";
import { PaneLayout, TabLayout } from "@macrograph/ui";
import { createWritableMemo } from "@solid-primitives/memo";
import "@total-typescript/ts-reset";
import { identity, Option } from "effect";
import {
	type ContextProvider,
	createContextProvider,
} from "@solid-primitives/context";
import type { DistributiveOmit } from "@tanstack/solid-query";
import { type Accessor, batch, createSignal } from "solid-js";
import {
	createStore,
	produce,
	reconcile,
	type StoreSetter,
	unwrap,
} from "solid-js/store";

import { useProjectService } from "./EffectRuntime";
import { PackageClients } from "./Packages/Clients";
import { ProjectState } from "./State";

export namespace TabState {
	export type TabState<TSettingsPage extends string = string> =
		| GraphTab
		| PackageTab
		| SettingsTab<TSettingsPage>;

	export type GraphTab = TabLayout.TabState<"graph"> & {
		graphId: Graph.Id;
		selection: Graph.ItemRef[];
		transform?: { translate: { x: number; y: number }; zoom: number };
	};
	export type PackageTab = TabLayout.TabState<"package"> & {
		packageId: Package.Id;
	};
	export type SettingsTab<TPage extends string> =
		TabLayout.TabState<"settings"> & { page: TPage };

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

export type PaneState<TSettingsPage extends string = string> = {
	id: number;
	selectedTab: number;
	tabs: Array<TabState.TabState<TSettingsPage> & { tabId: number }>;
};

type IdentityFn<T> = (t: T) => T;

function createLayoutState<TSettingsPage extends string>(opts?: {
	wrapPanesStore?: IdentityFn<
		ReturnType<typeof createStore<Record<number, PaneState<TSettingsPage>>>>
	>;
	wrapPaneLayoutStore?: IdentityFn<
		ReturnType<
			typeof createStore<PaneLayout.PaneLayout<number> | PaneLayout.Empty>
		>
	>;
}) {
	const [panes, setPanes] = (opts?.wrapPanesStore ?? identity)(
		createStore<Record<number, PaneState<TSettingsPage>>>({}),
	);

	const [paneLayout, setPaneLayout] = (opts?.wrapPaneLayoutStore ?? identity)(
		createStore<PaneLayout.PaneLayout<number> | PaneLayout.Empty>({
			variant: "empty",
		}),
	);

	return { panes, setPanes, paneLayout, setPaneLayout };
}

function createLayoutStateContext<TSettingsPage extends string>({
	panes,
	setPanes,
	paneLayout,
	setPaneLayout,
}: ReturnType<typeof createLayoutState<TSettingsPage>>) {
	// this really needs improving
	function removePane(id: number) {
		batch(() => {
			setPaneLayout((paneLayout) => PaneLayout.removePane(paneLayout, id));
			setPanes(id, undefined!);
		});
	}

	function openTab(
		data: DistributiveOmit<TabState.TabState<TSettingsPage>, "tabId">,
	) {
		batch(() => {
			const paneIds = Object.keys(panes);

			if (paneIds.length === 0) {
				const id = Math.random();
				setPanes(
					id,
					reconcile<PaneState<TSettingsPage>, PaneState<TSettingsPage>>({
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

	function moveSelectedTab(delta: number): boolean {
		const pane = focusedPane();
		if (!pane) return false;
		const index = pane.tabs.findIndex((t) => t.tabId === pane.selectedTab);
		if (index === -1) return false;
		let newIndex = (index + delta) % pane.tabs.length;
		if (newIndex < 0) newIndex += pane.tabs.length;
		const tab = pane.tabs[newIndex];
		if (!tab) return false;
		setPanes(pane.id, "selectedTab", tab.tabId);
		return true;
	}

	function updateTab(
		paneId: number,
		tabId: number,
		setter: StoreSetter<TabState.TabState<TSettingsPage>, any>,
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
		moveSelectedTab,
	};
}

const [LayoutStateProvider, _useLayoutState] = createContextProvider(
	createLayoutStateContext<string>,
);

export const useLayoutStateRaw = () => {
	const ctx = _useLayoutState();
	if (!ctx)
		throw new Error("useLayoutState must be used within a LayoutStateProvider");
	return ctx;
};

export { LayoutStateProvider };

export function createTypedLayoutState<TSettingsPage extends string>() {
	return {
		LayoutStateProvider: LayoutStateProvider as unknown as ContextProvider<
			Parameters<typeof createLayoutStateContext<TSettingsPage>>[0]
		>,
		useLayoutState: useLayoutStateRaw as unknown as Accessor<
			ReturnType<typeof createLayoutStateContext<TSettingsPage>>
		>,
		createLayoutState:
			createLayoutState as typeof createLayoutState<TSettingsPage>,
	};
}

export function usePaneTabs<TSettingsPage extends string>(
	pane: Accessor<PaneState<TSettingsPage>>,
) {
	const packageClients = useProjectService(PackageClients);
	const { state } = useProjectService(ProjectState);

	return pane()
		.tabs.map((tab) => {
			if (tab.type === "graph") {
				const graph = state.graphs[tab.graphId];
				if (!graph) return false;
				return { ...tab, graph };
			}
			if (tab.type === "settings") return tab;
			if (tab.type === "package") {
				const pkg = state.packages[tab.packageId];
				if (!pkg) return false;
				return packageClients.getPackage(tab.packageId).pipe(
					Option.map((client) => ({
						...tab,
						client,
						package: pkg,
					})),
					Option.getOrUndefined,
				);
			}
			return false;
		})
		.filter(Boolean);
}

export function defineBasePaneTabController<TSettingsPage extends string>(
	pane: Accessor<PaneState<TSettingsPage>>,
	schema: TabLayout.Schemas<TabState.TabState<TSettingsPage>>,
) {
	return TabLayout.defineController({
		get tabs() {
			return usePaneTabs(pane);
		},
		get selectedTab() {
			return pane().selectedTab;
		},
		schema,
	});
}
