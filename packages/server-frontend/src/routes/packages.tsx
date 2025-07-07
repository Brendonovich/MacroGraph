import { A } from "@solidjs/router";
import { For, type ParentProps, Suspense } from "solid-js";

import { usePresenceContext } from "../Presence/Context";
import { useProjectService } from "../AppRuntime";
import { PackagesSettings } from "../Packages/PackagesSettings";

export default function (props: ParentProps) {
	const packagesSettings = useProjectService(PackagesSettings);
	const presenceCtx = usePresenceContext();

	return (
		<div class="flex flex-row divide-x divide-gray-5 flex-1">
			<nav class="w-40 text-sm p-2 shrink-0 flex flex-col">
				<ul class="space-y-1 flex-1">
					<For each={packagesSettings.listPackages()}>
						{(id) => (
							<li>
								<A
									href={id}
									activeClass="bg-gray-5"
									inactiveClass="bg-transparent hover:bg-gray-4"
									class="block text-left w-full px-2 py-1 outline-none focus-visible:outline-solid rounded focus-visible:(outline-(1 yellow-4 offset-0))"
								>
									{id}
								</A>
							</li>
						)}
					</For>
				</ul>
				<div>{Object.keys(presenceCtx.clients).length} Clients Connected</div>
			</nav>
			<div class="max-w-lg w-full flex flex-col items-stretch p-4 gap-4 text-sm">
				<Suspense>{props.children}</Suspense>
			</div>
		</div>
	);
}
