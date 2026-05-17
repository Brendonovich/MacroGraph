import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { CheckBox, SelectInput } from "./components/ui";

export type Config = {
	nodes: {
		dimUnselectedConnections: boolean;
		indicateConnectedNodes: "off" | "highlightConnected" | "dimUnconnected";
		enableNumberGrouping: boolean;
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

export const [config, setConfig] = makePersisted(
	createStore<Config>({
		nodes: {
			dimUnselectedConnections: false,
			indicateConnectedNodes: "off",
			enableNumberGrouping: true,
		},
	}),
	{ name: "editor-config" },
);

export function ConfigContent() {
	return (
		<>
			<div class="w-48 shrink-0 overflow-y-auto border-r border-neutral-700">
				<div class="px-3 py-2 text-white font-medium">Nodes</div>
			</div>
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
				</div>
			</div>
		</>
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
