import {
	For,
	Match,
	Show,
	Switch,
	batch,
	createSignal,
	onMount,
} from "solid-js";
import { Card } from "@macrograph/ui";

import { useCoreContext } from "../../contexts";
import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";

export function CustomEvents() {
	const ctx = useCoreContext();
	const [search, setSearch] = createSignal("");

	return (
		<SidebarSection
			title="Custom Events"
			class="overflow-y-hidden flex flex-col"
		>
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
				<button
					type="button"
					class="hover:bg-white/10 rounded transition-colors"
					onClick={(e) => {
						e.stopPropagation();
						ctx.core.project.createCustomEvent();
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</button>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col divide-y divide-neutral-700 px-2">
					<For each={[...ctx.core.project.customEvents]}>
						{([id, event]) => {
							const [editingName, setEditingName] = createSignal(false);

							return (
								<li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
									<h3 class="flex flex-row gap-1 justify-between items-center">
										<Switch>
											<Match when={editingName()}>
												{(_) => {
													const [value, setValue] = createSignal(event.name);
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
														<>
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
																			event.name = value();
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
																		event.name = value();
																		setEditingName(false);
																	});
																}}
															/>
														</>
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
													{event.name}
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
													class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 transition-colors hover:bg-white/10 rounded"
													onClick={(e) => {
														e.stopPropagation();

														event.createField();
														ctx.core.project.save();
													}}
												>
													<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
												</button>

												<button
													type="button"
													class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 transition-colors hover:bg-white/10 rounded p-0.5"
													onClick={(e) => {
														e.stopPropagation();

														ctx.core.project.customEvents.delete(id);
														ctx.core.project.save();
													}}
												>
													<IconAntDesignDeleteOutlined class="size-4" />
												</button>
											</Match>
										</Switch>
									</h3>

									<ul class="divide-y divide-neutral-700 flex-1 px-2 bg-black/30 rounded-md">
										<For each={[...event.fields]}>
											{(field) => {
												const [editingName, setEditingName] =
													createSignal(false);

												return (
													<li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
														<div class="flex flex-row gap-1 justify-between items-center -mx-1">
															<Switch>
																<Match when={editingName()}>
																	{(_) => {
																		const [value, setValue] = createSignal(
																			field.name,
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
																							event.editFieldName(
																								field.id,
																								value(),
																							);
																							ctx.core.project.save();
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
																						event.editFieldName(
																							field.id,
																							value(),
																						);
																						ctx.core.project.save();
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
																		{field.name}
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
																		class="opacity-0 focus:opacity-100 group-hover/field:opacity-100 transition-colors hover:bg-white/10 rounded p-0.5"
																		onClick={(e) => {
																			e.stopPropagation();

																			ctx.core.project.customEvents.delete(id);
																			ctx.core.project.save();
																		}}
																	>
																		<IconAntDesignDeleteOutlined class="size-4" />
																	</button>
																</Match>
															</Switch>
														</div>

														<div class="flex flex-row justify-start">
															<TypeEditor
																type={field.type}
																onChange={(type) => {
																	event.editFieldType(field.id, type as any);
																}}
															/>
														</div>
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
