import type { GraphFunction } from "@macrograph/runtime";
import {
	For,
	Show,
	type ValidComponent,
	createMemo,
	createSignal,
} from "solid-js";

import { ContextMenu } from "@kobalte/core/context-menu";
import {
	ContextMenuContent,
	ContextMenuItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import {
	InlineTextEditor,
	InlineTextEditorContext,
	useInlineTextEditorCtx,
} from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

function FieldList(props: {
	title: string;
	items: Array<{ id: string; name: string; type: any }>;
	onAdd: () => void;
	onDelete: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onTypeChange: (id: string, type: any) => void;
}) {
	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		props.items.map((f) => [tokeniseString(f.name), f] as const),
	);
	const filtered = createTokenisedSearchFilter(search, tokenisedFilters);

	return (
		<SidebarSection title={props.title}>
			<div class="flex flex-row items-center w-full gap-1 p-1 border-b border-neutral-900">
				<SearchInput
					value={search()}
					onInput={(e) => {
						e.stopPropagation();
						setSearch(e.currentTarget.value);
					}}
				/>
				<IconButton
					type="button"
					title={`Add ${props.title}`}
					class="p-0.5"
					onClick={(e) => {
						e.stopPropagation();
						props.onAdd();
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col divide-y divide-neutral-700 px-2">
					<For each={filtered()}>
						{(item) => (
							<li class="flex flex-col gap-1 flex-1 group/item py-2 pt-1">
								<InlineTextEditorContext>
									<Show when>
										{(_) => {
											const inlineEditorCtx = useInlineTextEditorCtx()!;
											return (
												<ContextMenu placement="bottom-start">
													<InlineTextEditor<ValidComponent>
														as={(asProps) => (
															<ContextMenu.Trigger {...asProps} />
														)}
														value={item.name}
														onChange={(name) => props.onRename(item.id, name)}
													/>
													<ContextMenuContent>
														<ContextMenuItem
															onSelect={() => inlineEditorCtx.setEditing(true)}
														>
															<IconAntDesignEditOutlined /> Rename
														</ContextMenuItem>
														<ContextMenuItem
															class="text-red-500"
															onSelect={() => props.onDelete(item.id)}
														>
															<IconAntDesignDeleteOutlined />
															Delete
														</ContextMenuItem>
													</ContextMenuContent>
												</ContextMenu>
											);
										}}
									</Show>
								</InlineTextEditorContext>
								<div class="bg-black/30 p-2 rounded-md">
									<TypeEditor
										type={item.type}
										onChange={(type) => props.onTypeChange(item.id, type)}
									/>
								</div>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}

export function FunctionIO(props: { fn: GraphFunction }) {
	const ctx = useInterfaceContext();

	return (
		<>
			<FieldList
				title="Inputs"
				items={props.fn.inputs.map((f) => ({ id: f.id, name: f.name ?? f.id, type: f.type }))}
				onAdd={() => ctx.execute("createFunctionInput", { functionId: props.fn.id })}
				onDelete={(id) => ctx.execute("deleteFunctionInput", { functionId: props.fn.id, inputId: id })}
				onRename={(id, name) => ctx.execute("setFunctionInputName", { functionId: props.fn.id, inputId: id, name })}
				onTypeChange={(id, type) => ctx.execute("setFunctionInputType", { functionId: props.fn.id, inputId: id, type })}
			/>
			<FieldList
				title="Outputs"
				items={props.fn.outputs.map((f) => ({ id: f.id, name: f.name ?? f.id, type: f.type }))}
				onAdd={() => ctx.execute("createFunctionOutput", { functionId: props.fn.id })}
				onDelete={(id) => ctx.execute("deleteFunctionOutput", { functionId: props.fn.id, outputId: id })}
				onRename={(id, name) => ctx.execute("setFunctionOutputName", { functionId: props.fn.id, outputId: id, name })}
				onTypeChange={(id, type) => ctx.execute("setFunctionOutputType", { functionId: props.fn.id, outputId: id, type })}
			/>
		</>
	);
}
