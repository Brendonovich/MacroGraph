import { createContextProvider } from "@solid-primitives/context";
import { isMobile } from "@solid-primitives/platform";
import { createMemo, createSignal, Match, Switch } from "solid-js";

import { ConstantsSidebar } from "./ConstantsSidebar";
import { GraphsSidebar } from "./Graph/Sidebar";
import { useLayoutStateRaw } from "./LayoutState";
import { PackagesSidebar } from "./Packages/Sidebar";
import { Sidebar } from "./Sidebar";

export function NavSidebar() {
	const navSidebar = useNavSidebar();

	return (
		<Sidebar
			side="left"
			open={!!navSidebar.state()}
			onOpenChanged={(open) => {
				navSidebar.toggle(open);
			}}
		>
			<Switch>
				<Match when={navSidebar.state() === "graphs"}>
					<GraphsSidebar />
				</Match>
				<Match when={navSidebar.state() === "packages"}>
					<PackagesSidebar />
				</Match>
				<Match when={navSidebar.state() === "constants"}>
					<ConstantsSidebar />
				</Match>
			</Switch>
		</Sidebar>
	);
}

function createNavSidebar() {
	type Type = "graphs" | "packages" | "constants";

	const layoutState = useLayoutStateRaw();

	const get = () => {
		const t = layoutState.focusedTab();
		if (t?.type === "graph") return "graphs";
		if (t?.type === "package") return "packages";
		return null;
	};

	const [state, setState] = createSignal(isMobile ? null : get());

	const lastState = createMemo<string>((v) => {
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
