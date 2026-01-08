import { isMobile } from "@solid-primitives/platform";
import { cx } from "cva";
import type { ParentProps } from "solid-js";
import { Match, Show, Switch } from "solid-js";

import { isTouchDevice } from "./platform";

const BASE_CLASS =
	"w-56 flex flex-col items-stretch justify-start divide-y divide-gray-5 bg-gray-3 border-gray-5";

export function Sidebar(
	props: ParentProps<{
		side: "left" | "right";
		open: boolean;
		onOpenChanged(open: boolean): void;
	}>,
) {
	return (
		<Switch>
			<Match when={!isMobile}>
				<Show when={props.open}>
					<div
						class={cx(
							BASE_CLASS,
							props.side === "left" ? "border-r" : "border-l",
						)}
					>
						{props.children}
					</div>
				</Show>
			</Match>
			<Match when={isMobile}>
				<Show when={props.open}>
					<div
						class="absolute inset-0 bg-black/50 z-10 animate-in fade-in"
						onTouchStart={() => props.onOpenChanged(false)}
					/>
					<div
						class={cx(
							BASE_CLASS,
							"absolute inset-y-0 animate-in fade-in z-10",
							props.side === "left"
								? "left-0 slide-in-from-left-2 border-r"
								: "right-0 slide-in-from-right-2 border-l",
						)}
					>
						{props.children}
					</div>
				</Show>
				<div class="relative h-full shrink-0">
					<Show when={isTouchDevice && !props.open}>
						<button
							type="button"
							class={cx(
								"absolute z-10 top-1/2 -translate-y-1/2 py-1.5",
								props.side === "left"
									? "right-0 translate-x-full pr-1.5"
									: "right-full pl-1.5",
							)}
							onClick={() => {
								props.onOpenChanged(!props.open);
							}}
						>
							<div
								class={cx(
									"py-2 bg-gray-3 border border-gray-5",
									props.side === "left" ? "rounded-r" : "rounded-l",
								)}
							>
								<IconTablerChevronRight
									class={cx(
										"size-3.5",
										props.open !== (props.side === "right") && "rotate-180",
									)}
								/>
							</div>
						</button>
					</Show>
				</div>
			</Match>
		</Switch>
	);
}
