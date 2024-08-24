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
import {
	For,
	Match,
	Suspense,
	Switch,
	createMemo,
	createSignal,
	startTransition,
} from "solid-js";
import { CheckBox, SelectInput } from "./components/ui";

const initConfig = new Map();

export const [config, setConfig] = makePersisted(
	createSignal<Record<string, any>>(initConfig),
	{ name: "editorConfig" },
);

export function ConfigDialog() {
	const [open, setOpen] = createSignal(false);

	const configSections = createMemo(() => {
		return [
			{
				name: "Nodes",
				configOptions: [
					{
						id: "highlightConnections",
						name: "Dim connections of unselected nodes",
						type: "checkbox",
						default: true,
					},
					{
						id: "highlightConnectedNodes",
						name: "Indicate nodes connected to selected nodes",
						type: "enum",
						options: [
							{ id: "off", name: "Off" },
							{ id: "highlightConnected", name: "Highlight Connected" },
							{ id: "dimUnconnected", name: "Dim Unconnected" },
						],
						default: "off",
					},
				],
			},
		];
	});

	const [selectedConfigSection, setSelectedConfigSection] = createSignal(
		configSections()[0],
	);

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
							<For each={configSections()}>
								{(section) => (
									<Tabs.Trigger
										value={section.name}
										onClick={() =>
											startTransition(() => setSelectedConfigSection(section))
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
						<Suspense fallback="Loading">
							<For each={selectedConfigSection()?.configOptions}>
								{(configOption) => (
									<div class="flex items-center">
										{configOption.name}
										<Switch>
											<Match when={configOption.type === "checkbox"}>
												<CheckBox
													class="ml-auto"
													value={
														config()[configOption.id] ??
														(typeof configOption.default === "boolean" &&
															configOption.default)
													}
													onChange={(e) => {
														const c = config();
														c[configOption.id] = e;
														setConfig({ ...c });
													}}
												/>
											</Match>
											<Match
												when={
													configOption.type === "enum" && configOption.options
												}
											>
												{(enumOptions) => (
													<SelectInput
														class="!w-fit ml-auto !text-right"
														placement="bottom-end"
														options={enumOptions()}
														optionValue="id"
														optionTextValue="name"
														getLabel={(o) => o?.name}
														value={
															enumOptions().find(
																(i) => i.id === config()[configOption.id],
															) ??
															enumOptions().find(
																(i) => i.id === configOption.default,
															)
														}
														onChange={(e) => {
															const c = config();
															c[configOption.id] = e.id;
															setConfig({ ...c });
														}}
													/>
												)}
											</Match>
										</Switch>
									</div>
								)}
							</For>
						</Suspense>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
