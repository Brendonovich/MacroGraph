import type { Variable } from "@macrograph/runtime";
import { BasePrimitiveType, serializeValue, t } from "@macrograph/typesystem";
import {
	For,
	Match,
	Switch,
	batch,
	createMemo,
	createSignal,
	onMount,
} from "solid-js";

import { SidebarSection } from "../components/Sidebar";
import { TypeEditor } from "../components/TypeEditor";
import { CheckBox, FloatInput, IntInput, TextInput } from "../components/ui";
import { tokeniseString } from "../util";

export function Variables(props: {
	titlePrefix: string;
	variables: Array<Variable>;
	onCreateVariable(): void;
	onRemoveVariable(id: number): void;
	onSetVariableValue(id: number, value: any): void;
}) {
	const [search, setSearch] = createSignal("");

	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	const tokenisedFilters = createMemo(() =>
		props.variables.map((v) => [tokeniseString(v.name), v] as const),
	);

	const filteredVariables = createMemo(() => {
		const ret: Array<Variable> = [];

		for (const [tokens, variable] of tokenisedFilters()) {
			if (
				tokenisedSearch().every((token) =>
					tokens.some((t) => t.includes(token)),
				)
			)
				ret.push(variable);
		}

		return ret;
	});

	return (
		<SidebarSection
			title={`${props.titlePrefix} Variables`}
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

						props.onCreateVariable();
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</button>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col divide-y divide-neutral-700 px-2.5">
					<For each={filteredVariables()}>
						{(variable) => {
							const [editingName, setEditingName] = createSignal(false);

							return (
								<li class="flex flex-col gap-1 flex-1 group/item py-2 pt-1">
									<h3 class="flex flex-row justify-between items-center -mx-1.5 group gap-1">
										<Switch>
											<Match when={editingName()}>
												{(_) => {
													const [value, setValue] = createSignal(variable.name);
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
																			variable.name = value();
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
																		variable.name = value();
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
													{variable.name}
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

														props.onRemoveVariable(variable.id);
													}}
												>
													<IconAntDesignDeleteOutlined class="size-4" />
												</button>
											</Match>
										</Switch>
									</h3>
									<div class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden space-y-1">
										<TypeEditor
											type={variable.type}
											onChange={(type) => {
												batch(() => {
													variable.type = type;
													variable.value = type.default();
												});
											}}
										/>

										<Switch>
											<Match
												when={
													variable.type instanceof BasePrimitiveType &&
													variable.type
												}
											>
												{(type) => (
													<Switch>
														<Match when={type().primitiveVariant() === "bool"}>
															<CheckBox
																value={variable.value}
																onChange={(n) =>
																	props.onSetVariableValue(variable.id, n)
																}
															/>
														</Match>
														<Match
															when={type().primitiveVariant() === "string"}
														>
															<TextInput
																value={variable.value}
																onChange={(n) =>
																	props.onSetVariableValue(variable.id, n)
																}
															/>
														</Match>
														<Match when={type().primitiveVariant() === "int"}>
															<IntInput
																initialValue={variable.value}
																value={variable.value}
																onChange={(n) =>
																	props.onSetVariableValue(variable.id, n)
																}
															/>
														</Match>
														<Match when={type().primitiveVariant() === "float"}>
															<FloatInput
																initialValue={variable.value}
																value={variable.value}
																onChange={(n) =>
																	props.onSetVariableValue(variable.id, n)
																}
															/>
														</Match>
													</Switch>
												)}
											</Match>
											<Match
												when={
													variable.type instanceof t.List ||
													variable.type instanceof t.Map
												}
											>
												<div class="flex flex-row items-end gap-1 rounded p-1 bg-black/30">
													<pre class="flex-1 whitespace-pre-wrap max-w-full text-xs">
														{JSON.stringify(
															serializeValue(variable.value, variable.type),
															null,
															2,
														)}
													</pre>
													{(variable.type instanceof t.List
														? variable.value.length > 0
														: variable.value.size > 0) && (
														<button
															type="button"
															onClick={() => {
																if (variable.type instanceof t.List)
																	variable.value = [];
																else if (variable.type instanceof t.Map)
																	variable.value = new Map();
															}}
														>
															<IconSystemUiconsReset class="size-4" />
														</button>
													)}
												</div>
											</Match>
										</Switch>
									</div>
								</li>
							);
						}}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
