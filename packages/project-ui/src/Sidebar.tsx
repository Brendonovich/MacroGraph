import { cx } from "cva";
import type { ParentProps } from "solid-js";
import { Show } from "solid-js";

import { isTouchDevice } from "./platform";

export function Sidebar(
	props: ParentProps<{
		side: "left" | "right";
		open: boolean;
		onOpenChanged(open: boolean): void;
	}>,
) {
	return (
		<div class="relative h-full shrink-0 bg-gray-3">
			<Show when={props.open}>
				<div class="w-56 flex flex-col items-stretch justify-start divide-y divide-gray-5">
					{props.children}
				</div>
			</Show>
			<Show when={isTouchDevice}>
				<button
					type="button"
					class={cx(
						"absolute z-10 top-1/2 -translate-y-1/2 py-2 bg-gray-3 border border-gray-5",
						props.side === "left" ? "left-full" : "right-full",
					)}
					onClick={() => {
						props.onOpenChanged(!props.open);
					}}
				>
					<IconTablerChevronRight
						class={cx(
							"size-3.5",
							props.open !== (props.side === "right") && "rotate-180",
						)}
					/>
				</button>
			</Show>
		</div>
	);
}
