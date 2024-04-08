import clsx from "clsx";
import {
	JSX,
	ParentProps,
	Show,
	createRoot,
	createSignal,
	onCleanup,
} from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { createEventListenerMap } from "@solid-primitives/event-listener";

export type Side = "left" | "right";

export const MIN_WIDTH = 300;
export const SNAP_CLOSE_PCT = 0.65;

export interface SidebarProps extends ParentProps {
	width: number;
}

export function Sidebar(props: SidebarProps) {
	return (
		<div
			class="relative flex flex-col bg-neutral-600 shadow-2xl"
			style={{ width: `${props.width}px` }}
		>
			{props.children}
		</div>
	);
}

const MIN_HEIGHT = 250;

export function SidebarSection(
	props: ParentProps<{ title: string; right?: JSX.Element; class?: string }>,
) {
	const [open, setOpen] = makePersisted(createSignal(!false), {
		name: `sidebar-section-${props.title}-open`,
	});
	const [height, setHeight] = makePersisted(createSignal(MIN_HEIGHT), {
		name: `sidebar-section-${props.title}-height`,
	});

	return (
		<div class="flex flex-col h-auto relative">
			<button
				onClick={() => setOpen((o) => !o)}
				class="flex flex-row justify-between items-center bg-neutral-900 text-white font-medium shadow p-1 pl-2"
			>
				<span class="flex flex-row items-center gap-1.5">
					<IconFa6SolidChevronRight
						class="w-3 h-3"
						classList={{ "rotate-90": open() }}
					/>
					{props.title}
				</span>
				<div
					onClick={(e) => e.stopPropagation()}
					class="flex flex-row items-center"
				>
					{props.right}
				</div>
			</button>
			<Show when={open()}>
				<div
					class={clsx("overflow-y-auto", props.class)}
					style={{ height: `${height()}px` }}
				>
					{props.children}
				</div>
				<div
					onMouseDown={(downEvent) => {
						downEvent.stopPropagation();
						if (downEvent.button !== 0) return;

						createRoot((dispose) => {
							document.body.style.cursor = "ns-resize";
							onCleanup(() => (document.body.style.cursor = "auto"));

							const startHeight = height();

							createEventListenerMap(window, {
								mouseup: dispose,
								mousemove: (moveEvent) => {
									setHeight(
										Math.max(
											MIN_HEIGHT,
											startHeight + (moveEvent.clientY - downEvent.clientY),
										),
									);
								},
							});
						});
					}}
					class="h-0.5 w-full relative cursor-ns-resize bg-neutral-700 overflow-visible"
				>
					<div class="-top-0.5 -bottom-0.5 w-full absolute z-10" />
				</div>
			</Show>
		</div>
	);
}
