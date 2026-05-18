import { Accordion } from "@kobalte/core";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import { makePersisted } from "@solid-primitives/storage";
import clsx from "clsx";
import {
	Show,
	type JSX,
	type ParentProps,
	createRoot,
	createSignal,
	onCleanup,
} from "solid-js";

import { useSidebarEdit } from "../Sidebar/Project/SidebarEditContext";
import { sidebarConfig } from "../Sidebar/sidebarConfig";

export type Side = "left" | "right";

export const MIN_WIDTH = 250;
export const SNAP_CLOSE_PCT = 0.65;

export interface SidebarProps extends ParentProps {
	name: string;
	width: number;
	class?: string;
	initialValue?: Array<string>;
	toolbar?: JSX.Element;
	/** When true, children render in a scroll container instead of an accordion. */
	flat?: boolean;
}

export function Sidebar(props: SidebarProps) {
	const [value, setValue] = makePersisted(
		createSignal<Array<string>>(props.initialValue ?? []),
		{ name: `sidebar-${props.name}` },
	);

	const flat = () =>
		props.flat ?? (props.name === "Project" && sidebarConfig.editMode);

	return (
		<div
			class={clsx("relative flex flex-col bg-[#2c2c2c]", props.class)}
			style={{ width: `${props.width}px` }}
		>
			<Show when={props.toolbar}>
				<div class="relative z-30 shrink-0">{props.toolbar}</div>
			</Show>
			<div class="relative flex-1 min-h-0 flex flex-col">
				<Show
					when={flat()}
					fallback={
						<Accordion.Root
							class="overflow-y-auto outer-scroll flex-1 min-h-0"
							multiple
							value={value()}
							onChange={(v) => setValue(v)}
						>
							{props.children}
						</Accordion.Root>
					}
				>
					<div class="overflow-y-auto outer-scroll flex-1 min-h-0 relative">
						{props.children}
					</div>
				</Show>
			</div>
		</div>
	);
}

const MIN_HEIGHT = 250;

function SectionVisibilityToggle(props: {
	visible: boolean;
	onClick(): void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={props.visible}
			title={props.visible ? "Hide section" : "Show section"}
			onClick={(e) => {
				e.stopPropagation();
				props.onClick();
			}}
			class={clsx(
				"relative shrink-0 h-4 w-7 rounded-full transition-colors",
				props.visible ? "bg-sky-600" : "bg-neutral-600",
			)}
		>
			<span
				class={clsx(
					"absolute top-0.5 size-3 rounded-full bg-white transition-transform",
					props.visible ? "left-3.5" : "left-0.5",
				)}
			/>
		</button>
	);
}

export function SidebarSection(
	props: ParentProps<{ title: string; class?: string; fitContent?: boolean }>,
) {
	const edit = useSidebarEdit();
	const [height, setHeight] = makePersisted(createSignal(MIN_HEIGHT), {
		name: `sidebar-section-${props.title}-height`,
	});

	const customizing = () => sidebarConfig.editMode && edit;
	const index = () => edit?.sectionIndex(props.title) ?? -1;
	const dragged = () => edit?.isDragged(index()) ?? false;

	const sectionContent = (
		<>
			<div
				class={clsx("flex flex-col text-sm", props.class)}
				style={props.fitContent ? undefined : { height: `${height()}px` }}
			>
				{props.children}
			</div>
			<Show when={!props.fitContent}>
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
			</Show>
		</>
	);

	return (
		<Show
			when={customizing()}
			fallback={
				<Accordion.Item class="relative" value={props.title}>
					<Accordion.Header class="w-full">
						<Accordion.Trigger
							type="button"
							class="flex flex-row justify-between items-center text-sm text-white p-1 pl-1.5 bg-neutral-300/5 w-full shadow group"
						>
							<span class="flex flex-row items-center gap-1.5 font-semibold">
								<IconMaterialSymbolsArrowRightRounded class="size-3 scale-150 ui-group-expanded:rotate-90 transition-transform" />
								{props.title}
							</span>
						</Accordion.Trigger>
					</Accordion.Header>
					<Accordion.Content class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden">
						{sectionContent}
					</Accordion.Content>
				</Accordion.Item>
			}
		>
			<div
				data-sidebar-row
				class="flex flex-row items-center gap-1.5 text-sm text-white p-1 pl-1 bg-neutral-300/5 w-full shadow"
				classList={{
					"opacity-25": dragged(),
					"ring-1 ring-sky-500/30 bg-neutral-700/40": dragged(),
				}}
			>
				<button
					type="button"
					class="text-neutral-500 hover:text-white shrink-0 touch-none inline-flex cursor-grab active:cursor-grabbing p-0.5"
					onPointerDown={(e) => edit!.onDragStart(e, index())}
				>
					<IconMaterialSymbolsDragIndicator class="size-4" />
				</button>
				<span
					class="flex-1 font-semibold truncate"
					classList={{
						"text-neutral-500 line-through": !edit!.isVisible(props.title),
					}}
				>
					{props.title}
				</span>
				<SectionVisibilityToggle
					visible={edit!.isVisible(props.title)}
					onClick={() => edit!.toggleVisibility(props.title)}
				/>
			</div>
		</Show>
	);
}
