import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";

export type SidebarSectionItem = {
	id: string;
	visible: boolean;
};

export type SidebarConfig = {
	editMode: boolean;
	sections: SidebarSectionItem[];
};

export const DEFAULT_SECTION_ORDER = [
	"Packages",
	"Graphs",
	"Functions",
	"Queues",
	"Function Queues",
	"Console",
	"Project Variables",
	"Custom Types",
	"Resources",
	"Viewers",
] as const;

function createDefaultConfig(): SidebarConfig {
	return {
		editMode: false,
		sections: DEFAULT_SECTION_ORDER.map((id) => ({ id, visible: true })),
	};
}

/** Keeps the stored section order; appends any missing defaults at the end. */
export function mergeSectionsWithDefaults(
	sections: SidebarSectionItem[],
): SidebarSectionItem[] {
	const seen = new Set<string>();
	const merged: SidebarSectionItem[] = [];

	for (const s of sections) {
		if (seen.has(s.id)) continue;
		seen.add(s.id);
		merged.push(s);
	}

	for (const id of DEFAULT_SECTION_ORDER) {
		if (seen.has(id)) continue;
		seen.add(id);
		merged.push({ id, visible: true });
	}

	return merged;
}

export const [sidebarConfig, setSidebarConfig] = makePersisted(
	createStore<SidebarConfig>(createDefaultConfig()),
	{ name: "sidebar-config" },
);
