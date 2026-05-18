import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { CheckBox, SelectInput } from "./components/ui";
import {
	hydrateEditorConfig,
	startEditorConfigPersistence,
} from "./editorConfigStorage";

export type Config = {
	nodes: {
		dimUnselectedConnections: boolean;
		indicateConnectedNodes: "off" | "highlightConnected" | "dimUnconnected";
		enableNumberGrouping: boolean;
	};
	tabColors: {
		function: string;
		queue: string;
		functionQueue: string;
		package: string;
	};
};

const INDICATE_CONNECTED_NODES_OPTIONS = [
	{ id: "off", name: "Off" },
	{ id: "highlightConnected", name: "Highlight Connected" },
	{ id: "dimUnconnected", name: "Dim Unconnected" },
] satisfies Array<{
	id: Config["nodes"]["indicateConnectedNodes"];
	name: string;
}>;

const DEFAULT_CONFIG: Config = {
	nodes: {
		dimUnselectedConnections: false,
		indicateConnectedNodes: "off",
		enableNumberGrouping: true,
	},
	tabColors: {
		function: "#86efac",
		queue: "#93c5fd",
		functionQueue: "#93c5fd",
		package: "#22d3ee",
	},
};

export const [config, setConfig] = createStore<Config>(
	structuredClone(DEFAULT_CONFIG),
);

export async function initEditorConfigStorage() {
	await hydrateEditorConfig(setConfig, DEFAULT_CONFIG);
	startEditorConfigPersistence(() => config);
}

function ColorSelect(props: {
	value: string;
	onChange: (v: string) => void;
	label: string;
}) {
	return (
		<div class="flex items-center gap-4">
			<span>{props.label}</span>
			<div class="ml-auto flex items-center gap-2">
				<input
					type="color"
					value={props.value}
					onInput={(e) => props.onChange(e.currentTarget.value)}
					class="size-7 p-0.5 bg-neutral-800 border border-neutral-600 rounded cursor-pointer"
				/>
			</div>
		</div>
	);
}

export function ConfigContent() {
	return (
		<div class="flex-1 overflow-y-auto p-4 text-white">
			<div class="flex flex-col gap-3 max-w-lg">
				<div class="flex items-center gap-4">
					<span>Dim connections of unselected nodes</span>
					<CheckBox
						class="ml-auto"
						value={config.nodes.dimUnselectedConnections}
						onChange={(v) =>
							setConfig("nodes", "dimUnselectedConnections", v)
						}
					/>
				</div>
				<div class="flex items-center gap-4">
					<span>Indicate nodes connected to selected nodes</span>
					<SelectInput
						class="!w-fit ml-auto !text-right"
						placement="bottom-end"
						options={INDICATE_CONNECTED_NODES_OPTIONS}
						optionValue="id"
						optionTextValue="name"
						getLabel={(o) => o?.name}
						value={INDICATE_CONNECTED_NODES_OPTIONS.find(
							(o) => o.id === config.nodes.indicateConnectedNodes,
						)}
						onChange={(v) =>
							setConfig("nodes", "indicateConnectedNodes", v.id)
						}
					/>
				</div>
				<div class="flex items-center gap-4">
					<span>Enable number grouping (comma separator in numbers)</span>
					<CheckBox
						class="ml-auto"
						value={config.nodes.enableNumberGrouping}
						onChange={(v) => setConfig("nodes", "enableNumberGrouping", v)}
					/>
				</div>
				<ColorSelect
					label="Functions tab colour"
					value={config.tabColors.function}
					onChange={(v) => setConfig("tabColors", "function", v)}
				/>
				<ColorSelect
					label="Queues tab colour"
					value={config.tabColors.queue}
					onChange={(v) => setConfig("tabColors", "queue", v)}
				/>
				<ColorSelect
					label="Function Queues tab colour"
					value={config.tabColors.functionQueue}
					onChange={(v) => setConfig("tabColors", "functionQueue", v)}
				/>
				<ColorSelect
					label="Packages tab colour"
					value={config.tabColors.package}
					onChange={(v) => setConfig("tabColors", "package", v)}
				/>
			</div>
		</div>
	);
}

export function ConfigDialog() {
	const [open, setOpen] = createSignal(false);

	return (
		<Dialog onOpenChange={setOpen} open={open()}>
			<DialogTrigger<typeof Button>
				as={(props) => (
					<Button size="icon" variant="ghost" title="Settings" {...props} />
				)}
			>
				<IconTablerSettings class="size-6" />
			</DialogTrigger>
			<DialogContent class="min-h-[25rem] flex flex-col">
				<div class="p-4 border-b flex flex-row justify-between items-center">
					<DialogTitle class="font-bold text=2x1">Settings</DialogTitle>
					<DialogCloseButton />
				</div>
				<ConfigContent />
			</DialogContent>
		</Dialog>
	);
}
