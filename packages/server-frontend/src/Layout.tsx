import type { ParentProps } from "solid-js";

import { ConnectionStatusBanner } from "./ConnectionStatusBanner";

export function Layout(props: ParentProps) {
	return (
		<div class="w-full h-full flex flex-col overflow-hidden text-sm *:select-none *:cursor-default divide-y divide-gray-5">
			<ConnectionStatusBanner />
			{/*<Header />*/}
			<div class="flex flex-row flex-1 divide-x divide-gray-5">
				{props.children}
				{/* <Show when={globalState.logsPanelOpen}>
            <div class="p-2 w-80">Logs</div>
          </Show> */}
			</div>
		</div>
	);
}
