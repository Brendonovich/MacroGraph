import { Tabs } from "@kobalte/core";
import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";
import { makePersisted } from "@solid-primitives/storage";
import { For, createSignal, startTransition } from "solid-js";
import { createStore } from "solid-js/store";
import { CheckBox, SelectInput } from "./components/ui";

type Config = {
	nodes: {
		dimUnselectedConnections: boolean;
		indicateConnectedNodes: "off" | "highlightConnected" | "dimUnconnected";
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
		},
	}),
	{ name: "editor-config" },
);

export function ConfigDialog() {
	const [open, setOpen] = createSignal(false);

	// const configSections = createMemo(() => {
	//   return [
	//     {
	//       name: "Nodes",
	//       configOptions: [
	//         {
	//           id: "highlightConnections",
	//           name: "Dim connections of unselected nodes",
	//           type: "checkbox",
	//           default: true,
	//         },
	//         {
	//           id: "highlightConnectedNodes",
	//           name: "Indicate nodes connected to selected nodes",
	//           type: "enum",
	//           options: [
	//             { id: "off", name: "Off" },
	//             { id: "highlightConnected", name: "Highlight Connected" },
	//             { id: "dimUnconnected", name: "Dim Unconnected" },
	//           ],
	//           default: "off",
	//         },
	//       ],
	//     },
	//   ];
	// });

	const [selectedConfigSection, setSelectedConfigSection] =
		createSignal<keyof Config>("nodes");

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
				<div class="flex flex-row divide-x divide overflow-auto flex-1">
					<Tabs.Root value="test" orientation="vertical">
						<Tabs.List class="flex flex-col relative text-neutral-400 font-light">
							<For
								each={
									[{ id: "nodes", name: "Nodes" }] satisfies Array<{
										id: keyof Config;
										name: string;
									}>
								}
							>
								{(section) => (
									<Tabs.Trigger
										value={section.id}
										onClick={() =>
											startTransition(() =>
												setSelectedConfigSection(section.id),
											)
										}
										class="px-3 py-2 text-left ui-selected:text-white"
									>
										{section.name}
									</Tabs.Trigger>
								)}
							</For>
							<Tabs.Indicator class="bg-white w-[2px] absolute -right-[1.5px] data-[resizing='false']:transition-transform rounded-full" />
						</Tabs.List>
					</Tabs.Root>
					<div class="flex flex-col p-4 text-white min-w-[32rem] gap-1">
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
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
