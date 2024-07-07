import { For, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { useCoreContext } from "../../contexts";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";
import { IconButton } from "../../components/ui";

export function CustomEvents() {
	const [search, setSearch] = createSignal("");
	const ctx = useCoreContext();

	const tokenisedEvents = createMemo(() =>
		[...ctx.core.project.customEvents].map(
			([id, event]) => [tokeniseString(event.name), [id, event]] as const,
		),
	);

	const filteredEvents = createTokenisedSearchFilter(search, tokenisedEvents);

	return (
		<SidebarSection
			title="Custom Events"
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
				<IconButton
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						ctx.core.project.createCustomEvent();
					}}
				>
					<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
				</IconButton>
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col divide-y divide-neutral-700 px-2">
					<For each={filteredEvents()}>
						{([id, event]) => (
							<li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
								<InlineTextEditor
									value={event.name}
									onChange={(value) => {
										event.name = value;
									}}
								>
									<IconButton
										type="button"
										class="opacity-0 focus:opacity-100 group-hover/item:opacity-100"
										onClick={(e) => {
											e.stopPropagation();

											event.createField();
											ctx.core.project.save();
										}}
									>
										<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
									</IconButton>

									<IconButton
										type="button"
										class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 p-0.5"
										onClick={(e) => {
											e.stopPropagation();

											ctx.core.project.customEvents.delete(id);
											ctx.core.project.save();
										}}
									>
										<IconAntDesignDeleteOutlined class="size-4" />
									</IconButton>
								</InlineTextEditor>
								<ul class="divide-y divide-neutral-700 flex-1 px-2 bg-black/30 rounded-md">
									<For each={[...event.fields]}>
										{(field) => (
											<li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
												<InlineTextEditor
													value={field.name}
													onChange={(value) => {
														event.editFieldName(field.id, value);
														ctx.core.project.save();
													}}
													class="-mx-1"
												>
													<IconButton
														type="button"
														class="opacity-0 focus:opacity-100 group-hover/field:opacity-100 p-0.5"
														onClick={(e) => {
															e.stopPropagation();

															ctx.core.project.customEvents.delete(id);
															ctx.core.project.save();
														}}
													>
														<IconAntDesignDeleteOutlined class="size-4" />
													</IconButton>
												</InlineTextEditor>

												<div class="flex flex-row justify-start">
													<TypeEditor
														type={field.type}
														onChange={(type) => {
															event.editFieldType(field.id, type as any);
														}}
													/>
												</div>
											</li>
										)}
									</For>
								</ul>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
