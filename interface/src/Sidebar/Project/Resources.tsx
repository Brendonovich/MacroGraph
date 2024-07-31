import { DropdownMenu } from "@kobalte/core";
import type { ResourceType, ResourceTypeEntry } from "@macrograph/runtime";
import { For, Match, Switch, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { IconButton, SelectInput, TextInput } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { filterWithTokenisedSearch, tokeniseString } from "../../util";
import { InlineTextEditor } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

export function Resources() {
	const interfaceCtx = useInterfaceContext();

	const [search, setSearch] = createSignal("");
	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	const tokenisedResources = createMemo(() =>
		[...interfaceCtx.core.project.resources].map(([type, entry]) => {
			const tokenisedItems = entry.items.map(
				(item) => [tokeniseString(item.name), item] as const,
			);

			return [type, { ...entry, items: tokenisedItems }] as const;
		}),
	);

	const filteredResources = createMemo(() => {
		const ret: Array<[ResourceType<any, any>, ResourceTypeEntry]> = [];

		for (const [
			type,
			{ items: tokenisedItems, ...entry },
		] of tokenisedResources()) {
			const items = filterWithTokenisedSearch(tokenisedSearch, tokenisedItems);

			if (items.length > 0) ret.push([type, { ...entry, items }]);
		}

		return ret;
	});

	return (
		<SidebarSection title="Resources" class="overflow-y-hidden flex flex-col">
			<div class="flex flex-row items-center w-full gap-1 p-1 border-b border-neutral-900">
				<SearchInput
					value={search()}
					onInput={(e) => {
						e.stopPropagation();
						setSearch(e.currentTarget.value);
					}}
				/>
				<AddResourceButton />
			</div>
			<div class="flex-1 overflow-y-auto">
				<ul class="flex flex-col px-2 divide-y divide-neutral-700">
					<For each={filteredResources()}>
						{([type, data]) => (
							<li class="space-y-1.5 py-2">
								<div class="space-y-1 pl-1">
									<div class="flex flex-row items-center gap-2">
										<span class="font-medium">{type.name}</span>
										<span class="opacity-50 text-xs">{type.package.name}</span>
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
										{(item, index) => (
											<li class="space-y-1 pt-1 pb-2 group/item">
												<InlineTextEditor
													class="-mx-1"
													value={item.name}
													onChange={(value) => {
														item.name = value;
														interfaceCtx.save();
													}}
												>
													<IconButton
														type="button"
														class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 p-0.5"
														onClick={(e) => {
															e.stopPropagation();

															interfaceCtx.core.project.resources
																.get(type)
																?.items.splice(index(), 1);
															if (data.items.length < 1)
																interfaceCtx.core.project.resources.delete(
																	type,
																);

															interfaceCtx.save();
														}}
													>
														<IconAntDesignDeleteOutlined class="size-4" />
													</IconButton>
												</InlineTextEditor>
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
																	onChange={(source) => {
																		item.sourceId = source.id;
																		interfaceCtx.save();
																	}}
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
																onChange={(n) => {
																	item.value = n;
																	interfaceCtx.save();
																}}
															/>
														)}
													</Match>
												</Switch>
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

function AddResourceButton() {
	const interfaceCtx = useInterfaceContext();

	const resourceTypes = createMemo(() =>
		interfaceCtx.core.packages
			.map((p) => {
				if (p.resources.size > 0) return [p, [...p.resources]] as const;
			})
			.filter(Boolean),
	);

	return (
		<DropdownMenu.Root placement="bottom-end">
			<DropdownMenu.Trigger
				as={IconButton}
				onClick={(e) => e.stopPropagation()}
			>
				<IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class="mt-1 gap-2 bg-neutral-900 p-2 rounded w-48 max-h-52 flex flex-col overflow-y-auto text-white ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-expanded:slide-in-from-right-0.5 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 ui-closed:slide-out-to-right-0.5 duration-100 shadow">
					<For each={resourceTypes()}>
						{([pkg, types]) => (
							<div class="flex flex-col">
								<span class="text-xs text-neutral-400 mb-0.5">{pkg.name}</span>
								<For each={types}>
									{(type) => (
										<DropdownMenu.Item
											as="button"
											class="flex flex-row items-center px-1 py-0.5 w-full text-sm text-left hover:bg-white/10 rounded whitespace-nowrap text-ellipsis"
											onSelect={() => {
												interfaceCtx.core.project.createResource({
													type,
													name: "New Resource",
												});
											}}
										>
											{type.name}
										</DropdownMenu.Item>
									)}
								</For>
							</div>
						)}
					</For>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
