import type { Variable } from "@macrograph/runtime";
import { BasePrimitiveType, serializeValue, t } from "@macrograph/typesystem";
import { For, Match, Switch, batch, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../components/Sidebar";
import { TypeEditor } from "../components/TypeEditor";
import { CheckBox, FloatInput, IntInput, TextInput } from "../components/ui";
import { tokeniseString } from "../util";
import { InlineTextEditor } from "./InlineTextEditor";
import { SearchInput } from "./SearchInput";

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
				<SearchInput
					value={search()}
					onInput={(e) => {
						e.stopPropagation();
						setSearch(e.currentTarget.value);
					}}
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
				<ul class="flex flex-col divide-y divide-neutral-700 px-2">
					<For each={filteredVariables()}>
						{(variable) => (
							<li class="flex flex-col gap-1 flex-1 group/item py-2 pt-1">
								<InlineTextEditor
									value={variable.name}
									onChange={(value) => {
										variable.name = value;
									}}
								>
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
								</InlineTextEditor>
								<div class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden space-y-2 bg-black/20 p-2 rounded-md">
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
													<Match when={type().primitiveVariant() === "string"}>
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
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
