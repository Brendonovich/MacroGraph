import type { IoFieldDef } from "@macrograph/packages/src/script";
import { normalizeScriptIoType } from "@macrograph/packages/src/scriptIoTypes";
import { deserializeType, type t } from "@macrograph/typesystem";
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

export function FieldList(props: {
	title: string;
	items: IoFieldDef[];
	onAdd: () => void;
	onDelete: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onTypeChange: (id: string, type: t.Any) => void;
}) {
	const ctx = useInterfaceContext();
	const [search, setSearch] = createSignal("");

	const tokenisedFilters = createMemo(() =>
		props.items.map((f) => [tokeniseString(f.name), f] as const),
	);
	const filtered = createTokenisedSearchFilter(search, tokenisedFilters);

	const resolveType = (field: IoFieldDef) =>
		deserializeType(field.type, ctx.core.project.getType.bind(ctx.core.project));

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
			<div class="flex-1 overflow-y-auto max-h-64">
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
										scriptIoOnly
										type={resolveType(item)}
										onChange={(type) =>
											props.onTypeChange(
												item.id,
												normalizeScriptIoType(type),
											)
										}
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
