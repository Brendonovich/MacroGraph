import { createContextProvider } from "@solid-primitives/context";
import { createWritableMemo } from "@solid-primitives/memo";
import { isMobile } from "@solid-primitives/platform";
import { createMemo } from "solid-js";

import { useLayoutStateRaw } from "./LayoutState";

function createNavSidebar() {
	type Type = "graphs" | "packages" | "constants";

	const layoutState = useLayoutStateRaw();

	const get = () => {
		const t = layoutState.focusedTab();
		if (t?.type === "graph") return "graphs";
		if (t?.type === "package") return "packages";
		return null;
	};

	const [state, setState] = createWritableMemo(
		(v) => {
			if (v === null) return null;
			return get() ?? v;
		},
		isMobile ? null : get(),
	);

	const lastState = createMemo((v) => {
		return state() ?? v;
	}, "graphs");

	function toggle(value?: Type | boolean) {
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

const [NavSidebarProvider, useNavSidebar_] = createContextProvider(() =>
	createNavSidebar(),
);

const useNavSidebar = () => {
	const ctx = useNavSidebar_();
	if (!ctx)
		throw new Error(
			"useNavSidebar must be called underneath a NavSidebarProvider",
		);
	return ctx;
};

export { NavSidebarProvider, useNavSidebar };
