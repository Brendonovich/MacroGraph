import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { Card } from "@macrograph/ui";
import { DropdownMenu } from "@kobalte/core";

import { useCore } from "../../contexts";
import { SidebarSection } from "../../components/Sidebar";
import { SelectInput, TextInput } from "../../components/ui";

export function Resources() {
	const core = useCore();

	const resources = createMemo(() => [...core.project.resources]);

	return (
		<SidebarSection title="Resources" right={<AddResourceButton />}>
			<ul class="p-2 space-y-2">
				<For each={resources()}>
					{([type, data]) => {
						const [open, setOpen] = createSignal(true);

						return (
							<Card as="li" class="divide-y divide-black">
								<div class="p-2 space-y-1">
									<button onClick={() => setOpen((o) => !o)}>
										<div class="flex flex-row items-center gap-2">
											<IconFa6SolidChevronRight
												class="w-3 h-3"
												classList={{ "rotate-90": open() }}
											/>
											<span class="font-medium">{type.name}</span>
										</div>
									</button>
									<Show when={open()}>
										<div class="flex flex-row items-center gap-2">
											Default
											<div class="flex-1">
												<SelectInput
													options={data.items}
													optionValue="id"
													optionTextValue="name"
													getLabel={(i) => i.name}
													onChange={(source) => (data.default = source.id)}
													value={data.items.find((s) => s.id === data.default)}
												/>
											</div>
										</div>
									</Show>
								</div>
								<Show when={open()}>
									<ul class="space-y-2">
										<For each={data.items}>
											{(item, index) => {
												const [editingName, setEditingName] =
													createSignal(false);

												return (
													<li class="space-y-1 p-2">
														<div class="space-y-1 flex flex-row gap-2 justify-between items-center">
															<Switch>
																<Match when={editingName()}>
																	{(_) => {
																		const [value, setValue] = createSignal(
																			item.name,
																		);

																		return (
																			<>
																				<input
																					class="flex-1 text-black"
																					value={value()}
																					onChange={(e) =>
																						setValue(e.target.value)
																					}
																				/>
																				<div class="flex flex-row">
																					<button
																						onClick={() => {
																							item.name = value();
																							setEditingName(false);
																							core.project.save();
																						}}
																					>
																						<IconAntDesignCheckOutlined class="w-5 h-5" />
																					</button>
																					<button
																						onClick={() =>
																							setEditingName(false)
																						}
																					>
																						<IconBiX class="w-6 h-6" />
																					</button>
																				</div>
																			</>
																		);
																	}}
																</Match>
																<Match when={!editingName()}>
																	<span class="shrink-0">{item.name}</span>
																	<div class="gap-2 flex flex-row">
																		<button
																			onClick={(e) => {
																				e.stopPropagation();

																				setEditingName(true);
																			}}
																		>
																			<IconAntDesignEditOutlined />
																		</button>

																		<button
																			onClick={(e) => {
																				e.stopPropagation();

																				data.items.splice(index(), 1);
																				if (data.items.length < 1)
																					core.project.resources.delete(type);

																				core.project.save();
																			}}
																		>
																			<IconAntDesignDeleteOutlined />
																		</button>
																	</div>
																</Match>
															</Switch>
														</div>
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
								</Show>
							</Card>
						);
					}}
				</For>
			</ul>
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
			<DropdownMenu.Trigger onClick={(e) => e.stopPropagation()}>
				<IconMaterialSymbolsAddRounded class="w-6 h-6" />
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
