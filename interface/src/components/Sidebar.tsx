import clsx from "clsx";
import {
	type JSX,
	type ParentProps,
	Show,
	createRoot,
	createSignal,
	onCleanup,
} from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import { Accordion } from "@kobalte/core";

export type Side = "left" | "right";

export const MIN_WIDTH = 300;
export const SNAP_CLOSE_PCT = 0.65;

export interface SidebarProps extends ParentProps {
	width: number;
	class?: string;
}

export function Sidebar(props: SidebarProps) {
	return (
		<Accordion.Root
			class={clsx(
				"relative flex flex-col border-neutral-700 bg-neutral-400/5",
				props.class,
			)}
			style={{ width: `${props.width}px` }}
			multiple
		>
			{props.children}
		</Accordion.Root>
	);
}

const MIN_HEIGHT = 250;

export function SidebarSection(
	props: ParentProps<{ title: string; class?: string }>,
) {
	const [open, setOpen] = makePersisted(createSignal(!false), {
		name: `sidebar-section-${props.title}-open`,
	});
	const [height, setHeight] = makePersisted(createSignal(MIN_HEIGHT), {
		name: `sidebar-section-${props.title}-height`,
	});

	return (
		<Accordion.Item class="relative" value={props.title} forceMount>
			<Accordion.Header class="w-full">
				<Accordion.Trigger
					type="button"
					onClick={() => setOpen((o) => !o)}
					class="flex flex-row justify-between items-center text-sm text-white p-1 pl-2 bg-neutral-300/5 w-full shadow"
				>
					<span class="flex flex-row items-center gap-1 font-semibold">
						{/* <IconMaterialSymbolsArrowRightRounded
						class="size-7"
						classList={{ "rotate-90": open() }}
					/> */}
						{props.title}
					</span>
				</Accordion.Trigger>
			</Accordion.Header>
			<Accordion.Content class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden">
				<div
					class={clsx("overflow-y-auto text-sm", props.class)}
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
					class="h-px w-full relative cursor-ns-resize bg-neutral-700 overflow-visible"
				>
					<div class="-top-0.5 -bottom-0.5 w-full absolute z-10" />
				</div>
			</Accordion.Content>
		</Accordion.Item>
	);
}
