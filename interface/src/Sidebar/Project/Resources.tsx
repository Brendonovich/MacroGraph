import {
	For,
	Match,
	Show,
	Switch,
	batch,
	createMemo,
	createSignal,
	onMount,
} from "solid-js";
import { DropdownMenu } from "@kobalte/core";

import { useCore } from "../../contexts";
import { SidebarSection } from "../../components/Sidebar";
import { SelectInput, TextInput } from "../../components/ui";

export function Resources() {
	const [search, setSearch] = createSignal("");
	const core = useCore();

	const resources = createMemo(() => [...core.project.resources]);

	return (
		<SidebarSection title="Resources" class="overflow-y-hidden flex flex-col">
			<div class="flex flex-row items-center w-full gap-1 p-1 border-b border-neutral-900">
				<input
					value={search()}
					onInput={(e) => {
						e.stopPropagation();
						setSearch(e.currentTarget.value);
					}}
					onKeyDown={(e) => e.stopPropagation()}
					type="text"
					class="h-6 w-full flex-1 bg-neutral-900 border-none rounded-sm text-xs !pl-1.5 focus-visible:outline-none focus:ring-1 focus:ring-primary-500 focus:ring-opacity-50 transition-colors"
					placeholder="Search"
				/>
				<AddResourceButton />
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col px-2 divide-y divide-neutral-700">
					<For each={resources()}>
						{([type, data]) => {
							return (
								<li class="space-y-1.5 py-2">
									<div class="space-y-1 pl-1">
										<div class="flex flex-row items-center gap-2">
											<span class="font-medium">{type.name}</span>
											<span class="opacity-50 text-xs">
												{type.package.name}
											</span>
										</div>
										<div class="flex flex-row items-center gap-2">
											<span class="text-xs font-medium">Default</span>
											<div class="flex-1">
												<SelectInput
													options={data.items}
													optionValue="id"
													optionTextValue="name"
													getLabel={(i) => i.name}
													onChange={(source) => {
														data.default = source.id;
													}}
													value={data.items.find((s) => s.id === data.default)}
												/>
											</div>
										</div>
									</div>
									<ul class="bg-black/30 rounded divide-y divide-neutral-700 px-2">
										<For each={data.items}>
											{(item, index) => {
												const [editingName, setEditingName] =
													createSignal(false);

												return (
													<li class="space-y-1 pt-1 pb-2 group/item">
														<h3 class="flex flex-row gap-1 justify-between items-center -mx-1">
															<Switch>
																<Match when={editingName()}>
																	{(_) => {
																		const [value, setValue] = createSignal(
																			item.name,
																		);
																		let ref: HTMLInputElement;

																		let focused = false;

																		onMount(() => {
																			setTimeout(() => {
																				ref.focus();
																				ref.focus();
																				focused = true;
																			});
																		});

																		return (
																			<input
																				ref={ref!}
																				class="flex-1 bg-neutral-900 rounded text-sm border-none py-0.5 px-1.5"
																				value={value()}
																				onInput={(e) => {
																					setValue(e.target.value);
																				}}
																				onKeyDown={(e) => {
																					if (e.key === "Enter") {
																						e.preventDefault();
																						e.stopPropagation();

																						if (!focused) return;
																						batch(() => {
																							item.name = value();
																							core.project.save();
																							setEditingName(false);
																						});
																					} else if (e.key === "Escape") {
																						e.preventDefault();
																						e.stopPropagation();

																						setEditingName(false);
																					}
																					e.stopPropagation();
																				}}
																				onFocusOut={() => {
																					if (!focused) return;
																					batch(() => {
																						item.name = value();
																						core.project.save();
																						setEditingName(false);
																					});
																				}}
																			/>
																		);
																	}}
																</Match>
																<Match when={!editingName()}>
																	<span
																		class="flex-1 hover:bg-white/10 rounded flex flex-row items-center justify-between py-0.5 px-1.5"
																		onDblClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();

																			setEditingName(true);
																		}}
																	>
																		{item.name}
																		<button
																			type="button"
																			class="pointer-events-none opacity-0 focus:opacity-100"
																			onClick={() => {
																				setEditingName(true);
																			}}
																		>
																			<IconAntDesignEditOutlined class="size-4" />
																		</button>
																	</span>

																	<button
																		type="button"
																		class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 transition-colors hover:bg-white/10 rounded p-0.5"
																		onClick={(e) => {
																			e.stopPropagation();

																			data.items.splice(index(), 1);
																			if (data.items.length < 1)
																				core.project.resources.delete(type);

																			core.project.save();
																		}}
																	>
																		<IconAntDesignDeleteOutlined class="size-4" />
																	</button>
																</Match>
															</Switch>
														</h3>
														<Switch>
															<Match
																when={
																	"sources" in type &&
																	"sourceId" in item &&
																	([type, item] as const)
																}
																keyed
															>
																{([type, item]) => {
																	const sources = createMemo(() =>
																		type.sources(type.package),
																	);

																	return (
																		<SelectInput
																			options={sources()}
																			optionValue="id"
																			optionTextValue="display"
																			getLabel={(i) => i.display}
																			onChange={(source) =>
																				(item.sourceId = source.id)
																			}
																			value={sources().find(
																				(s) => s.id === item.sourceId,
																			)}
																		/>
																	);
																}}
															</Match>
															<Match
																when={"type" in type && "value" in item && item}
																keyed
															>
																{(item) => (
																	<TextInput
																		value={item.value}
																		onChange={(n) => (item.value = n)}
																	/>
																)}
															</Match>
														</Switch>
													</li>
												);
											}}
										</For>
									</ul>
								</li>
							);
						}}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}

function AddResourceButton() {
	const core = useCore();

	const resourceTypes = createMemo(() =>
		core.packages
			.map((p) => {
				if (p.resources.size > 0) return [p, [...p.resources]] as const;
			})
			.filter(Boolean),
	);

	return (
		<DropdownMenu.Root placement="bottom-end">
			<DropdownMenu.Trigger
				class="hover:bg-white/10 rounded transition-colors"
				onClick={(e) => e.stopPropagation()}
			>
				<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class="bg-neutral-900 border border-black p-2 rounded w-52 max-h-48 flex flex-col overflow-y-auto text-white">
					<For each={resourceTypes()}>
						{([pkg, types]) => (
							<>
								<span class="p-1">{pkg.name}</span>
								<For each={types}>
									{(type) => (
										<DropdownMenu.Item
											as="button"
											class="flex flex-row items-center w-full px-2 py-0.5 text-left hover:bg-white/20 rounded text-sm"
											onSelect={() => {
												core.project.createResource({
													type,
													name: "New Resource",
												});
											}}
										>
											{type.name}
										</DropdownMenu.Item>
									)}
								</For>
							</>
						)}
					</For>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
