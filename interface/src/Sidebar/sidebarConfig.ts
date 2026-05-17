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

const DEFAULT_ORDER = [
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
];

function createDefaultConfig(): SidebarConfig {
	return {
		editMode: false,
		sections: DEFAULT_ORDER.map((id) => ({ id, visible: true })),
	};
}

export const [sidebarConfig, setSidebarConfig] = makePersisted(
	createStore<SidebarConfig>(createDefaultConfig()),
	{ name: "sidebar-config" },
);
