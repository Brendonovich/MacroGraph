import { focusRingClasses } from "@macrograph/ui";
import { cx } from "cva";
import { For, Show } from "solid-js";

import { useProjectService } from "../EffectRuntime";
import { useLayoutStateRaw } from "../LayoutState";
import { ProjectState } from "../State";
import { PackageClients } from "./Clients";

export function PackagesSidebar() {
	const packageClients = useProjectService(PackageClients);
	const { state } = useProjectService(ProjectState);
	const layoutState = useLayoutStateRaw();

	const selected = () => {
		const s = layoutState.focusedTab();
		if (s?.type === "package") return s.packageId;
	};

	return (
		<>
			<input
				class={cx(
					"px-2 bg-gray-3 dark:bg-gray-2 h-8 text-sm",
					focusRingClasses("inset"),
				)}
				placeholder="Search Packages..."
				disabled
			/>
			<ul>
				<For each={packageClients.listPackages()}>
					{(pkgId) => (
						<Show when={state.packages[pkgId]}>
							{(pkg) => (
								<li>
									<button
										type="button"
										class={cx(
											"w-full data-[selected='true']:bg-gray-2  hover:bg-gray-2 px-2 p-1 text-left bg-transparent",
											focusRingClasses("inset"),
										)}
										data-selected={selected() === pkgId}
										onClick={() =>
											layoutState.openTab({ type: "package", packageId: pkgId })
										}
									>
										{pkg().name}
									</button>
								</li>
							)}
						</Show>
					)}
				</For>
			</ul>
		</>
	);
}
