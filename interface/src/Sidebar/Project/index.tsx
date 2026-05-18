import type { FunctionQueue, Graph, GraphFunction, Project, Queue } from "@macrograph/runtime";
import clsx from "clsx";
import { For, Show, createMemo, type JSX } from "solid-js";

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
import { ProjectSidebarEditList } from "./ProjectSidebarEditList";
import {
	mergeSectionsWithDefaults,
	sidebarConfig,
	setSidebarConfig,
} from "../sidebarConfig";

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

export function ProjectSidebarToolbar() {
	return (
		<div class="shrink-0 flex flex-row items-center justify-end px-1 py-0.5 border-b border-neutral-700/50">
			<button
				type="button"
				title={
					sidebarConfig.editMode
						? "Done customizing sidebar"
						: "Customize sidebar sections"
				}
				aria-pressed={sidebarConfig.editMode}
				onClick={() => setSidebarConfig("editMode", (v) => !v)}
				class={clsx(
					"p-1 rounded transition-colors",
					sidebarConfig.editMode
						? "text-sky-400 bg-sky-500/15 hover:bg-sky-500/25"
						: "text-neutral-400 hover:text-white hover:bg-neutral-700/50",
				)}
			>
				<Show
					when={sidebarConfig.editMode}
					fallback={<IconMaterialSymbolsEditRounded class="size-4" />}
				>
					<IconTablerCheck class="size-4" />
				</Show>
			</button>
		</div>
	);
}

export function Sidebar(props: {
	project: Project;
	currentGraph?: Graph;
	onGraphClicked(graph: Graph): void;
	onFunctionClicked?(fn: GraphFunction): void;
	onQueueClicked?(queue: Queue): void;
	onFunctionQueueClicked?(queue: FunctionQueue): void;
	onPackageClicked?(pkg: { name: string }): void;
}) {
	const orderedSections = createMemo(() =>
		mergeSectionsWithDefaults(sidebarConfig.sections),
	);

	const sectionRenderers = (): Record<string, () => JSX.Element> => ({
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
	});

	const sectionsToRender = createMemo(() => {
		const renderers = sectionRenderers();
		const list = sidebarConfig.editMode
			? orderedSections()
			: orderedSections().filter((s) => s.visible);

		return list
			.map((s) => ({
				id: s.id as SectionKey,
				render: renderers[s.id],
			}))
			.filter((s) => s.render);
	});

	return (
		<Show
			when={sidebarConfig.editMode}
			fallback={
				<For each={sectionsToRender()}>{(section) => section.render()}</For>
			}
		>
			<ProjectSidebarEditList>
				<For each={sectionsToRender()}>{(section) => section.render()}</For>
			</ProjectSidebarEditList>
		</Show>
	);
}
