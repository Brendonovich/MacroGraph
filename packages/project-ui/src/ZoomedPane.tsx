import type { ParentProps } from "solid-js";

export function ZoomedPaneWrapper(props: ParentProps) {
	return (
		<div class="absolute inset-0 z-10 flex items-strech">
			<div class="m-2 divide-x divide-gray-5 flex flex-row flex-1 border border-gray-5 bg-gray-2 pointer-events-auto">
				{props.children}
			</div>
		</div>
	);
}
