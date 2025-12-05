import { Accordion } from "@kobalte/core";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import { makePersisted } from "@solid-primitives/storage";
import clsx from "clsx";
import {
	type ParentProps,
	createRoot,
	createSignal,
	onCleanup,
} from "solid-js";

export type Side = "left" | "right";

export const MIN_WIDTH = 250;
export const SNAP_CLOSE_PCT = 0.65;

export interface SidebarProps extends ParentProps {
	name: string;
	width: number;
	class?: string;
	initialValue?: Array<string>;
}

export function Sidebar(props: SidebarProps) {
	const [value, setValue] = makePersisted(
		createSignal<Array<string>>(props.initialValue ?? []),
		{ name: `sidebar-${props.name}` },
	);

	return (
		<div
			class={clsx("relative flex flex-col bg-[#2c2c2c]", props.class)}
			style={{ width: `${props.width}px` }}
		>
			<Accordion.Root
				class="overflow-y-auto outer-scroll flex-1"
				multiple
				value={value()}
				onChange={(v) => setValue(v)}
			>
				{props.children}
			</Accordion.Root>
		</div>
	);
}

const MIN_HEIGHT = 250;

export function SidebarSection(
	props: ParentProps<{ title: string; class?: string }>,
) {
	const [height, setHeight] = makePersisted(createSignal(MIN_HEIGHT), {
		name: `sidebar-section-${props.title}-height`,
	});

	return (
		<Accordion.Item class="relative" value={props.title}>
			<Accordion.Header class="w-full">
				<Accordion.Trigger
					type="button"
					class="flex flex-row justify-between items-center text-sm text-white p-1 pl-1.5 bg-neutral-300/5 w-full shadow group"
				>
					<span class="flex flex-row items-center gap-1.5 font-semibold">
						<IconMaterialSymbolsArrowRightRounded class="size-3 scale-150 ui-expanded:rotate-90 transition-transform" />
						{props.title}
					</span>
				</Accordion.Trigger>
			</Accordion.Header>
			<Accordion.Content class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden">
				<div
					class={clsx("flex flex-col text-sm", props.class)}
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
							onCleanup(() => {
								document.body.style.cursor = "auto";
							});

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
