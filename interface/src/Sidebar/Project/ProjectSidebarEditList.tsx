import clsx from "clsx";
import { Show, createMemo, type ParentProps } from "solid-js";

import {
	type SidebarSectionItem,
	mergeSectionsWithDefaults,
	sidebarConfig,
	setSidebarConfig,
} from "../sidebarConfig";
import {
	SidebarEditProvider,
	createDragState,
	type SidebarEditActions,
} from "./SidebarEditContext";

export function ProjectSidebarEditList(props: ParentProps) {
	let listRef: HTMLDivElement | undefined;
	let currentPos: number | null = null;
	const [drag, dragActions] = createDragState();

	const sections = createMemo(() =>
		mergeSectionsWithDefaults(sidebarConfig.sections),
	);

	const toggleVisibility = (id: string) => {
		const configIdx = sidebarConfig.sections.findIndex((s) => s.id === id);
		if (configIdx === -1) {
			setSidebarConfig("sections", (items) => [
				...items,
				{ id, visible: false },
			]);
			return;
		}
		setSidebarConfig("sections", configIdx, "visible", (v) => !v);
	};

	const persistOrder = (ordered: SidebarSectionItem[]) => {
		setSidebarConfig("sections", ordered);
	};

	const swap = (from: number, to: number) => {
		if (from === to) return;
		const items = [...sections()];
		const [moved] = items.splice(from, 1);
		items.splice(to, 0, moved);
		persistOrder(items);
	};

	const rowElements = () =>
		listRef
			? ([...listRef.querySelectorAll("[data-sidebar-row]")] as HTMLElement[])
			: [];

	const editActions: SidebarEditActions = {
		sectionIndex: (id) => sections().findIndex((s) => s.id === id),
		isVisible: (id) => sections().find((s) => s.id === id)?.visible ?? true,
		isDragged: (index) => drag().active && drag().index === index,
		toggleVisibility,
		onDragStart(e, index) {
			e.preventDefault();
			const el = e.currentTarget as HTMLElement;
			currentPos = index;
			const section = sections()[index];
			if (!section || !listRef) return;

			const listRect = listRef.getBoundingClientRect();
			dragActions.start(index, section.id, e.clientY - listRect.top);
			el.setPointerCapture(e.pointerId);

			const onMove = (ev: PointerEvent) => {
				if (currentPos === null || !listRef) return;
				const children = rowElements();
				let target = children.length - 1;
				for (let i = 0; i < children.length; i++) {
					const r = children[i].getBoundingClientRect();
					if (ev.clientY < r.top + r.height / 2) {
						target = i;
						break;
					}
				}
				if (target !== currentPos) {
					swap(currentPos, target);
					currentPos = target;
					dragActions.setIndex(target);
				}
				const listRect = listRef.getBoundingClientRect();
				dragActions.setGhostY(ev.clientY - listRect.top);
			};

			const onUp = () => {
				document.removeEventListener("pointermove", onMove);
				document.removeEventListener("pointerup", onUp);
				currentPos = null;
				dragActions.end();
			};

			document.addEventListener("pointermove", onMove);
			document.addEventListener("pointerup", onUp);
		},
	};

	return (
		<SidebarEditProvider value={editActions}>
			<div
				ref={listRef}
				class="relative"
				classList={{ "select-none": drag().active }}
			>
				{props.children}

				<Show when={drag().ghostId}>
					<div
						class="absolute left-0 right-0 flex flex-row items-center gap-1.5 px-1 py-1 text-sm bg-neutral-700 shadow-lg ring-1 ring-sky-400/60 z-30 pointer-events-none"
						style={{
							top: `${drag().ghostY}px`,
							transform: "translateY(-50%)",
						}}
					>
						<span class="text-neutral-300 shrink-0 inline-flex">
							<IconMaterialSymbolsDragIndicator class="size-4" />
						</span>
						<span class="flex-1 font-semibold text-white truncate">
							{drag().ghostId}
						</span>
					</div>
				</Show>
			</div>
		</SidebarEditProvider>
	);
}
