import clsx from "clsx";
import type { Component } from "solid-js";

import type { SplitEdge } from "../mosaicLayout";

export const SplitDropOverlay: Component<{
	edge: SplitEdge;
}> = (props) => {
	return (
		<div class="pointer-events-none absolute inset-0 z-30">
			<div
				class={clsx(
					"absolute bg-sky-500/25 border-2 border-sky-400/80",
					props.edge === "left" && "left-0 top-0 bottom-0 w-1/2",
					props.edge === "right" && "right-0 top-0 bottom-0 w-1/2",
					props.edge === "top" && "left-0 top-0 right-0 h-1/2",
					props.edge === "bottom" && "left-0 bottom-0 right-0 h-1/2",
				)}
			/>
		</div>
	);
};
