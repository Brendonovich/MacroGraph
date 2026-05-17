import { createMemo } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";

export function Packages(props?: { onPackageClicked?: (pkg: { name: string }) => void }) {
	const ctx = useInterfaceContext();

	const packages = createMemo(() =>
		ctx.core.packages
			.sort((a, b) => a.name.localeCompare(b.name))
			.filter((p) => !!p.SettingsUI),
	);

	return (
		<SidebarSection title="Packages" class="overflow-y-hidden flex flex-col">
			<div class="flex-1 overflow-y-auto">
				<div class="flex flex-col p-1 space-y-0.5">
					{packages().length === 0 && (
						<span class="text-neutral-500 text-sm px-2 py-1">No packages with settings</span>
					)}
					<ul class="flex flex-col">
						{packages().map((pkg) => (
							<li>
								<button
									type="button"
									class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm transition-colors"
									onClick={() => props?.onPackageClicked?.(pkg)}
								>
									{pkg.name}
								</button>
							</li>
						))}
					</ul>
				</div>
			</div>
		</SidebarSection>
	);
}
