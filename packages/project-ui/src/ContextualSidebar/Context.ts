import { identity } from "effect";
import type { Graph, Node } from "@macrograph/project-domain";
import { createContextProvider } from "@solid-primitives/context";
import { isMobile } from "@solid-primitives/platform";
import { createMemo, createSignal } from "solid-js";

import { useLayoutStateRaw } from "../LayoutState";

type IdentityFn<T> = (t: T) => T;

function createContextualSidebar(opts?: {
	wrapOpenSignal?: IdentityFn<ReturnType<typeof createSignal<boolean>>>;
}) {
	const { focusedPane } = useLayoutStateRaw();

	const state = createMemo<
		| null
		| { type: "graph"; graph: Graph.Id }
		| { type: "node"; graph: Graph.Id; node: Node.Id }
	>((_) => {
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

const [ContextualSidebarProvider, useContextualSidebar_] =
	createContextProvider(
		(opts: NonNullable<Parameters<typeof createContextualSidebar>[0]>) =>
			createContextualSidebar(opts),
	);

const useContextualSidebar = () => {
	const ctx = useContextualSidebar_();
	if (!ctx)
		throw new Error(
			"useNavSidebar must be called underneath a NavSidebarProvider",
		);
	return ctx;
};

export { ContextualSidebarProvider, useContextualSidebar };
