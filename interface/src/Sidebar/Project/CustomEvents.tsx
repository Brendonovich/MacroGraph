import type { CustomEvent } from "@macrograph/runtime";
import { For, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { useCoreContext } from "../../contexts";
import { tokeniseString } from "../../util";
import { InlineTextEditor } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

export function CustomEvents() {
	const ctx = useCoreContext();
	const [search, setSearch] = createSignal("");

	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	const events = createMemo(() => [...ctx.core.project.customEvents]);

	const tokenisedEvents = createMemo(() =>
		events().map(([id, event]) => {
			return [tokeniseString(event.name), [id, event]] as const;
		}),
	);

	const filteredEvents = createMemo(() => {
		const ret: Array<[number, CustomEvent]> = [];

		for (const [tokens, [id, event]] of tokenisedEvents()) {
			if (
				tokenisedSearch().every((token) =>
					tokens.some((t) => t.includes(token)),
				)
			) {
				ret.push([id, event]);
			}
		}

		return ret;
	});

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
					<For each={filteredEvents()}>
						{([id, event]) => (
							<li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
								<InlineTextEditor
									value={event.name}
									onChange={(value) => {
										event.name = value;
									}}
								>
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
