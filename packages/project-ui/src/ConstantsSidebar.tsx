import { Record } from "effect";
import { Popover } from "@kobalte/core/popover";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Select } from "@kobalte/core/select";
import { focusRingClasses } from "@macrograph/ui";
import { useMutation } from "@tanstack/solid-query";
import { cx } from "cva";
import { createMemo, createSignal, For, Index, Show } from "solid-js";

import { ProjectActions } from "./Actions";
import { useProjectService } from "./EffectRuntime";
import { ProjectState } from "./State";

export function ConstantsSidebar() {
	const actions = useProjectService(ProjectActions);
	const { state } = useProjectService(ProjectState);

	return (
		<div class="pt-2">
			<div class="flex flex-row px-2 justify-between">
				<span class="text-gray-11 text-xs font-medium">Resource Constants</span>
				<AddResourceConstantButton />
			</div>
			<div class="p-2 divide-y divide-gray-5 flex flex-col *:pt-1.5 *:pb-2.5">
				<For each={Object.keys(state.constants)}>
					{(constantId) => {
						const constant = () => state.constants[constantId];

						const updateValue = useMutation(() => ({
							mutationFn: (value: string) =>
								actions.UpdateResourceConstant(constantId, value),
						}));

						const renameMutation = useMutation(() => ({
							mutationFn: ({
								name,
								value,
							}: {
								name?: string;
								value?: string;
							}) => actions.UpdateResourceConstant(constantId, value, name),
						}));

						const data = () => {
							const c = constant();
							if (!c) return null;
							const pkg = state.packages[c.pkg];
							if (!pkg) return null;
							const resource = pkg.resources[c.resource];
							if (!resource) return null;
							return { constant: c, pkg, resource };
						};

						return (
							<Show when={data()}>
								{(data) => {
									const options = () => data()?.resource.values;

									const option = () =>
										options().find((o) => o.id === data().constant.value) ??
										null;

									type Option = {
										id: string;
										display: string;
									};
									return (
										<div class="flex flex-col gap-1 first:pt-0 last:pb-0">
											<div class="flex flex-row justify-between items-baseline">
												<ConstantRenameDialog
													name={data().constant.name}
													onRename={(name) => renameMutation.mutate({ name })}
													isRenaming={renameMutation.isPending}
												/>
												<span class="text-xs text-gray-11">
													{data().resource.name}
												</span>
											</div>
											<Select<Option>
												value={option()}
												options={options()}
												optionValue="id"
												optionTextValue="display"
												placeholder={
													<i class="text-gray-11">
														{options().length === 0 ? "No Options" : "No Value"}
													</i>
												}
												gutter={4}
												disabled={
													// !setProperty ||
													// setProperty.isPending ||
													options().length === 0
												}
												onChange={(v) => {
													if (!v) return;
													updateValue.mutate(v.id);
												}}
												itemComponent={(props) => (
													<Show when={props.item.rawValue.id !== ""}>
														<Select.Item
															item={props.item}
															class="p-1 py-0.5 block w-full text-left focus-visible:outline-none ui-highlighted:bg-blue-6 rounded-[0.125rem]"
														>
															<Select.ItemLabel>
																{props.item.rawValue.display}
															</Select.ItemLabel>
														</Select.Item>
													</Show>
												)}
											>
												<Select.Trigger
													class={cx(
														"flex flex-row items-center w-full text-gray-12 text-xs bg-gray-6 pl-1.5 pr-1 py-0.5 appearance-none rounded-sm",
														!option() && "ring-1 ring-red-9 outline-none",
														focusRingClasses("outline"),
													)}
												>
													<Select.Value<Option> class="flex-1 text-left">
														{(state) => state.selectedOption().display}
													</Select.Value>
													{options().length > 0 && (
														<Select.Icon
															as={IconMaterialSymbolsArrowRightRounded}
															class="size-4 ui-closed:rotate-90 ui-expanded:-rotate-90 transition-transform"
														/>
													)}
												</Select.Trigger>
												<Select.Content class="z-50 ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 overflow-y-hidden text-xs bg-gray-6 rounded space-y-1 p-1">
													<Select.Listbox class="focus-visible:outline-none max-h-[12rem] overflow-y-auto" />
												</Select.Content>
											</Select>
										</div>
									);
								}}
							</Show>
						);
					}}
				</For>
			</div>
		</div>
	);
}

function ConstantRenameDialog(props: {
	name: string;
	onRename: (name: string) => void;
	isRenaming: boolean;
}) {
	const [editName, setEditName] = createSignal(props.name);

	return (
		<Popover placement="right-start" gutter={8}>
			<Popover.Trigger
				class={cx(
					"text-xs text-gray-12 hover:text-gray-11 focus-visible:outline-none",
					focusRingClasses("outline"),
				)}
			>
				{props.name}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					class="z-50 w-52 text-xs overflow-hidden bg-gray-3 border border-gray-6 rounded shadow-lg focus-visible:outline-none ui-expanded:(animate-in fade-in slide-in-from-left-2) ui-closed:(animate-out fade-out slide-out-to-left-2)"
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<div class="flex flex-col gap-2 p-2 pb-0">
						<span class="text-xs font-medium text-gray-12">
							Rename Constant
						</span>
						<input
							type="text"
							value={editName()}
							onInput={(e) => setEditName(e.currentTarget.value)}
							class="border border-gray-5 bg-gray-3 px-2 py-1 text-xs text-gray-12 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow"
							disabled={props.isRenaming}
						/>
						<div class="flex flex-row h-7 border-t border-gray-5 divide-x divide-gray-5 text-center">
							<Popover.CloseButton
								class={cx(
									"flex-1 rounded-bl text-gray-11 hover:text-gray-12",
									focusRingClasses("inset"),
								)}
								disabled={props.isRenaming}
							>
								Cancel
							</Popover.CloseButton>
							<button
								onClick={() => {
									props.onRename(editName());
								}}
								class={cx(
									"flex-1 rounded-br bg-gray-12 text-gray-3 hover:text-gray-12 hover:bg-gray-6",
									focusRingClasses("inset"),
								)}
								disabled={props.isRenaming || !editName().trim()}
							>
								{props.isRenaming ? "Saving..." : "Save"}
							</button>
						</div>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	);
}

function AddResourceConstantButton() {
	const actions = useProjectService(ProjectActions);
	const { state } = useProjectService(ProjectState);

	return (
		<DropdownMenu placement="bottom">
			<DropdownMenu.Trigger
				title="Create Resource Constant"
				class={cx(
					"size-5 flex items-center justify-center bg-transparent text-gray-11 @hover-bg-gray-6 focus-visible:bg-gray-6 @hover-text-gray-12 rounded-sm",
					focusRingClasses("outline"),
				)}
			>
				<IconBiX class="rotate-45" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class="p-1 bg-gray-3 flex flex-col gap-1 z-10 text-xs border border-gray-5 animate-in fade-in slide-in-from-top-1 focus-visible:outline-none">
					<Index
						each={Record.toEntries(state.packages).filter(
							(p) => Record.size(p[1].resources) > 0,
						)}
					>
						{(pkg) => (
							<Show when={state.packages[pkg()[0]]}>
								{(pkg) => {
									const resources = createMemo(() =>
										Record.toEntries(pkg().resources),
									);

									return (
										<Show when={resources().length > 0}>
											<div>
												<span class="text-gray-11">{pkg().name}</span>
												<For each={resources()}>
													{(resource) => (
														<DropdownMenu.Item
															class={cx(
																"py-0.5 px-1 @hover-bg-gray-5 cursor-default rounded",
																focusRingClasses("outline"),
															)}
															onSelect={() => {
																actions.CreateResourceConstant(
																	pkg().id,
																	resource[0],
																);
															}}
														>
															{resource[1].name}
														</DropdownMenu.Item>
													)}
												</For>
											</div>
										</Show>
									);
								}}
							</Show>
						)}
					</Index>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu>
	);
}
