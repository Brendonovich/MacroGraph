import type { FunctionQueue, Graph, GraphFunction, Project, Queue } from "@macrograph/runtime";
import { For, Show, createMemo, createSignal, type JSX } from "solid-js";

import { CustomTypes } from "./CustomTypes";
import { FunctionQueues } from "./FunctionQueues";
import { Functions } from "./Functions";
import { Graphs } from "./Graphs";
import { Packages } from "./Packages";
import { Console } from "./PrintOutput";
import { Queues } from "./Queues";
import { Resources } from "./Resources";
import { Variables } from "./Variables";
import { Viewers } from "./Viewers";
import { sidebarConfig, setSidebarConfig } from "../sidebarConfig";

type SectionKey =
	| "Graphs"
	| "Functions"
	| "Console"
	| "Project Variables"
	| "Queues"
	| "Function Queues"
	| "Packages"
	| "Custom Types"
	| "Resources"
	| "Viewers";

const sectionTitles: Record<SectionKey, string> = {
	Graphs: "Graphs",
	Functions: "Functions",
	Console: "Console",
	"Project Variables": "Project Variables",
	Queues: "Queues",
	"Function Queues": "Function Queues",
	Packages: "Packages",
	"Custom Types": "Custom Types",
	Resources: "Resources",
	Viewers: "Viewers",
};

export function Sidebar(props: {
	project: Project;
	currentGraph?: Graph;
	onGraphClicked(graph: Graph): void;
	onFunctionClicked?(fn: GraphFunction): void;
	onQueueClicked?(queue: Queue): void;
	onFunctionQueueClicked?(queue: FunctionQueue): void;
	onPackageClicked?(pkg: { name: string }): void;
}) {
	const visibleSections = createMemo(() => {
		const renderers: Record<string, () => JSX.Element> = {
			Graphs: () => (
				<Graphs
					currentGraph={props.currentGraph?.id}
					onGraphClicked={props.onGraphClicked}
				/>
			),
			Functions: () => (
				<Functions onFunctionClicked={(fn) => props.onFunctionClicked?.(fn)} />
			),
			Console: () => <Console />,
			"Project Variables": () => <Variables project={props.project} />,
			Queues: () => (
				<Queues
					project={props.project}
					onQueueClicked={(queue) => props.onQueueClicked?.(queue)}
				/>
			),
			"Function Queues": () => (
				<FunctionQueues
					project={props.project}
					onFunctionQueueClicked={(queue) =>
						props.onFunctionQueueClicked?.(queue)
					}
				/>
			),
			Packages: () => <Packages onPackageClicked={props.onPackageClicked} />,
			"Custom Types": () => <CustomTypes />,
			Resources: () => <Resources />,
			Viewers: () => <Viewers />,
		};

		return sidebarConfig.sections
			.filter((s) => s.visible)
			.map((s) => ({
				id: s.id as SectionKey,
				render: renderers[s.id],
			}))
			.filter((s) => s.render);
	});

	return (
		<>
			<For each={visibleSections()}>
				{(section) => (
					<div class="relative">
						{section.render()}
					</div>
				)}
			</For>

			<Show when={sidebarConfig.editMode}>
				<SidebarEditor />
			</Show>
		</>
	);
}

function SidebarEditor() {
	let listRef: HTMLDivElement | undefined;
	let currentPos: number | null = null;
	const [dragActive, setDragActive] = createSignal(false);
	const [ghostY, setGhostY] = createSignal(0);
	const [ghostSection, setGhostSection] = createSignal<{ id: string; visible: boolean } | null>(null);

	const toggleVisibility = (id: string) => {
		const idx = sidebarConfig.sections.findIndex((s) => s.id === id);
		if (idx === -1) return;
		setSidebarConfig("sections", idx, "visible", (v) => !v);
	};

	const swap = (from: number, to: number) => {
		if (from === to) return;
		const items = [...sidebarConfig.sections];
		const [moved] = items.splice(from, 1);
		items.splice(to, 0, moved);
		setSidebarConfig("sections", items);
	};

	const handlePointerDown = (e: PointerEvent, index: number) => {
		const el = e.currentTarget as HTMLElement;
		currentPos = index;
		setDragActive(true);
		setGhostSection(sidebarConfig.sections[index]);
		if (listRef) {
			const listRect = listRef.getBoundingClientRect();
			setGhostY(e.clientY - listRect.top);
		}
		el.setPointerCapture(e.pointerId);

		// Listen on document so pointerup always fires (even outside the element)
		const onMove = (ev: PointerEvent) => {
			if (currentPos === null || !listRef) return;
			const children = [...listRef.children] as HTMLElement[];
			let target = children.length - 1;
			for (let i = 0; i < children.length; i++) {
				const r = children[i].getBoundingClientRect();
				if (ev.clientY < r.top + r.height / 2) { target = i; break; }
			}
			if (target !== currentPos) {
				swap(currentPos, target);
				currentPos = target;
			}
			const listRect = listRef.getBoundingClientRect();
			setGhostY(ev.clientY - listRect.top);
		};

		const onUp = () => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			currentPos = null;
			setDragActive(false);
			setGhostSection(null);
		};

		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
	};

	return (
		<div class="absolute inset-0 z-20 bg-neutral-900/95 flex flex-col">
			<div class="flex flex-row items-center justify-between p-2 border-b border-neutral-700">
				<span class="text-xs text-neutral-300 font-semibold">
					Drag sections to reorder, toggle to show/hide
				</span>
				<button
					type="button"
					onClick={() => setSidebarConfig("editMode", false)}
					class="text-xs text-neutral-400 hover:text-white"
				>
					Close
				</button>
			</div>
			<div
				ref={listRef}
				class="flex-1 overflow-y-auto p-1 space-y-0.5 relative"
				classList={{ "select-none": dragActive() }}
			>
				<For each={sidebarConfig.sections}>
					{(section, index) => {
						const isDragged = dragActive() && currentPos === index();
						return (
							<div
								class="flex flex-row items-center gap-2 rounded"
								classList={{
									"p-1.5": !isDragged,
									"p-2 bg-neutral-700/30 ring-1 ring-sky-500/40 rounded shadow": isDragged,
									"opacity-20": isDragged,
								}}
							>
								<span
									class="text-neutral-500 hover:text-white shrink-0 touch-none inline-flex cursor-grab active:cursor-grabbing"
									onPointerDown={(e) => handlePointerDown(e, index())}
								>
									<IconMaterialSymbolsDragIndicator class="size-5" />
								</span>
								<span class="flex-1 text-sm text-neutral-200">
									{section.id}
								</span>
								<label class="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={section.visible}
										onChange={() => toggleVisibility(section.id)}
										class="rounded border-neutral-600 size-3.5"
									/>
								</label>
							</div>
						);
					}}
				</For>

				{/* Ghost – floats above the cursor */}
				<Show when={ghostSection()}>
					<div
						class="absolute left-1 right-1 flex flex-row items-center gap-2 p-2 rounded bg-neutral-700 shadow-xl shadow-black/50 ring-1 ring-sky-400 z-30 pointer-events-none"
						style={{
							top: `${ghostY()}px`,
							transform: "translateY(-50%)",
						}}
					>
						<span class="text-neutral-300 shrink-0 inline-flex">
							<IconMaterialSymbolsDragIndicator class="size-5" />
						</span>
						<span class="flex-1 text-sm text-white font-medium">
							{ghostSection()?.id ?? ""}
						</span>
					</div>
				</Show>
			</div>
		</div>
	);
}
