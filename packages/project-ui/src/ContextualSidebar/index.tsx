import { Array, Iterable, Option, pipe } from "effect";
import { Popover } from "@kobalte/core/popover";
import { Select } from "@kobalte/core/select";
import type { Package, Schema } from "@macrograph/project-domain";
import { focusRingClasses } from "@macrograph/ui";
import { useMutation } from "@tanstack/solid-query";
import { cx } from "cva";
import { createMemo, For, Match, Show, Switch } from "solid-js";

import { ProjectActions } from "../Actions";
import { useProjectService } from "../EffectRuntime";
import { matchSchemaTypeBackgroundColour } from "../Graph/Node";
import { PackageClients } from "../Packages/Clients";
import { Sidebar } from "../Sidebar";
import { ProjectState } from "../State";
import { useContextualSidebar } from "./Context";

export { ContextualSidebarProvider } from "./Context";

export function ContextualSidebar() {
	const contextualSidebar = useContextualSidebar();

	return (
		<Sidebar
			side="right"
			open={contextualSidebar.open()}
			onOpenChanged={(open) => {
				contextualSidebar.setOpen(open);
			}}
		>
			<ContextualSidebarContent />
		</Sidebar>
	);
}

export function ContextualSidebarContent() {
	const self = useContextualSidebar();
	const { state } = useProjectService(ProjectState);
	const actions = useProjectService(ProjectActions);

	return (
		<Show
			when={self.state()}
			fallback={
				<div class="w-full h-full text-gray-11 italic text-center flex-1 p-4">
					No information available
				</div>
			}
			keyed
		>
			{(data) => (
				<Switch>
					<Match when={data.type === "graph" && state.graphs[data.graph]}>
						{(graph) => (
							<div class="flex flex-col items-stretch p-2 gap-1">
								<span class="font-medium text-gray-12">Graph Info</span>
								<div class="flex flex-col">
									<span class="text-xs font-medium text-gray-11">Name</span>
									<span class="text-gray-12">{graph().name}</span>
								</div>
								<div class="flex flex-col">
									<span class="text-xs font-medium text-gray-11">
										Total Nodes
									</span>
									<span class="text-gray-12">{graph().nodes.length}</span>
								</div>
							</div>
						)}
					</Match>
					<Match
						when={
							data.type === "node" &&
							state.graphs[data.graph]?.nodes.find((n) => n.id === data.node)
						}
					>
						{(node) => {
							const pkg = () => state.packages[node().schema.pkg];
							const schema = () => pkg()?.schemas.get(node().schema.id);

							return (
								<div class="flex flex-col items-stretch p-2 gap-1">
									<span class="font-medium text-gray-12">Node Info</span>
									<div class="flex flex-col">
										<span class="text-xs font-medium text-gray-11">Name</span>
										<span class="text-gray-12">{node().name}</span>
									</div>
									<Show when={schema()}>
										{(schema) => (
											<>
												<div class="flex flex-col">
													<span class="text-xs font-medium text-gray-11 mb-1">
														Schema
													</span>
													<SchemaInfoButton schema={schema()} package={pkg()} />
												</div>
											</>
										)}
									</Show>
									<Show when={schema()}>
										{(schema) => (
											<>
												{schema().properties.length > 0 && (
													<>
														<span class="font-medium text-gray-12 mt-4">
															Properties
														</span>

														<div class="flex flex-col">
															<For each={schema().properties}>
																{(property) => {
																	const setProperty = useMutation(() => ({
																		mutationFn: async (value: string) =>
																			actions.SetNodeProperty(
																				data.graph,
																				node().id,
																				property.id,
																				value,
																			),
																	}));

																	return (
																		<>
																			<span class="text-xs font-medium text-gray-11 mb-1">
																				{property.name}
																			</span>
																			<Show
																				when={
																					"resource" in property && property
																				}
																			>
																				{(property) => {
																					const options = createMemo(() =>
																						pipe(
																							state.constants,
																							Iterable.fromRecord,
																							Iterable.filterMap(
																								([id, constant]) => {
																									if (
																										constant.type ===
																											"resource" &&
																										constant.resource ===
																											property().resource
																									)
																										return Option.some({
																											id,
																											display: constant.name,
																										} as const);
																									return Option.none();
																								},
																							),
																							Array.fromIterable,
																						),
																					);

																					const option = () =>
																						options().find(
																							(o) =>
																								o.id ===
																								node().properties?.[
																									property().id
																								],
																						) ?? null;

																					type Option = {
																						id: string;
																						display: string;
																					};

																					return (
																						<Select<Option>
																							value={option()}
																							options={options()}
																							optionValue="id"
																							optionTextValue="display"
																							placeholder={
																								<i class="text-gray-11">
																									No Value
																								</i>
																							}
																							gutter={4}
																							disabled={
																								!setProperty ||
																								setProperty.isPending
																							}
																							onChange={(v) => {
																								if (!v) return;
																								setProperty?.mutate(v.id);
																							}}
																							itemComponent={(props) => (
																								<Show
																									when={
																										props.item.rawValue.id !==
																										""
																									}
																								>
																									<Select.Item
																										item={props.item}
																										class="p-1 py-0.5 block w-full text-left focus-visible:outline-none ui-highlighted:bg-blue-6 rounded-[0.125rem]"
																									>
																										<Select.ItemLabel>
																											{
																												props.item.rawValue
																													.display
																											}
																										</Select.ItemLabel>
																									</Select.Item>
																								</Show>
																							)}
																						>
																							<Select.Trigger
																								class={cx(
																									"flex flex-row items-center w-full text-gray-12 text-xs bg-gray-6 pl-1.5 pr-1 py-0.5 appearance-none rounded-sm",
																									focusRingClasses("outline"),
																									!option() &&
																										"ring-1 ring-red-9 outline-none",
																								)}
																							>
																								<Select.Value<Option> class="flex-1 text-left">
																									{(state) =>
																										state.selectedOption()
																											.display
																									}
																								</Select.Value>
																								<Select.Icon
																									as={
																										IconMaterialSymbolsArrowRightRounded
																									}
																									class="size-4 ui-closed:rotate-90 ui-expanded:-rotate-90 transition-transform"
																								/>
																							</Select.Trigger>
																							<Select.Content class="z-50 ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 overflow-y-hidden text-xs bg-gray-6 rounded space-y-1 p-1">
																								<Select.Listbox class="focus-visible:outline-none max-h-[12rem] overflow-y-auto" />
																							</Select.Content>
																						</Select>
																					);
																				}}
																			</Show>
																			<Show
																				when={"type" in property && property}
																			>
																				{(property) => (
																					<Switch>
																						<Match
																							when={property().type === "S"}
																						>
																							<input
																								class={cx(
																									"bg-gray-2 h-6 text-xs px-1 ring-1 ring-gray-6 rounded-sm",
																									focusRingClasses("inset"),
																								)}
																								onKeyDown={(e) => {
																									e.stopPropagation();

																									if (e.key === "Enter") {
																										setProperty.mutate(
																											e.currentTarget.value,
																										);
																										e.currentTarget.blur();
																									}
																								}}
																								value={
																									(node().properties?.[
																										property().id
																									] as string) ?? ""
																								}
																							/>
																						</Match>
																					</Switch>
																				)}
																			</Show>
																		</>
																	);
																}}
															</For>
														</div>
													</>
												)}
											</>
										)}
									</Show>

									{/*<div class="flex flex-col">
										<span class="text-xs font-medium text-gray-11">
											Total Nodes
										</span>
										<span class="text-gray-12">
											{node().nodes.length}
										</span>
									</div>*/}
								</div>
							);
						}}
					</Match>
				</Switch>
			)}
		</Show>
	);
}

function SchemaInfoButton(props: {
	schema: { name: string; id: string; type: Schema.Type };
	package: { id: Package.Id; name: string } | undefined;
}) {
	let closeButton!: HTMLButtonElement;

	const packageClients = useProjectService(PackageClients);

	const pkg = () =>
		props.package
			? Option.getOrUndefined(packageClients.getPackage(props.package?.id))
			: undefined;

	return (
		<Popover placement="left-start" gutter={6}>
			<Popover.Trigger
				class={cx(
					"flex h-9 items-center cursor-pointer group relative border border-gray-6 rounded-sm overflow-hidden text-left",
					focusRingClasses("outline"),
				)}
			>
				<Show when={pkg()?.packageIcon}>
					{(src) => <img src={src()} alt="Schema" class="size-9" />}
				</Show>
				<div class="flex-1 min-w-0 px-1">
					<span class="block text-xs font-medium text-gray-12 truncate">
						{props.schema.name}
					</span>
					<span class="block text-xs text-gray-11 truncate">
						{props.package?.name || "Unknown Package"}
					</span>
				</div>
				<div class="inset-0 absolute bg-gray-1 group-hover:opacity-20 opacity-0 transition-opacity duration-100" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					class="z-50 w-52 text-xs overflow-hidden bg-gray-3 border border-gray-6 rounded shadow-lg max-w-xs focus-visible:outline-none ui-expanded:(animate-in fade-in slide-in-from-right-2) ui-closed:(animate-out fade-out slide-out-to-right-2)"
					onOpenAutoFocus={(e) => {
						e.preventDefault();
						closeButton.focus();
					}}
				>
					<div
						class={cx(
							"text-gray-12 font-medium leading-tight p-1",
							matchSchemaTypeBackgroundColour(props.schema.type),
						)}
					>
						<span class="text-gray-12 font-medium leading-tight text-shadow-lg">
							{props.schema.name}
						</span>
					</div>
					<div class="flex flex-col p-1.5 gap-1">
						<div class="flex flex-row items-center gap-1">
							<span class="font-medium text-xs text-gray-11">Package</span>
							<button
								type="button"
								disabled
								class={cx(
									"flex items-center flex-1 cursor-pointer group relative border border-gray-6 rounded overflow-hidden text-left",
									focusRingClasses("outline"),
								)}
							>
								<Show when={pkg()?.packageIcon}>
									{(src) => <img src={src()} alt="Schema" class="size-5" />}
								</Show>
								<div class="flex-1 min-w-0 pl-1 pr-1.5">
									<span class="block text-xs font-normal text-gray-12 truncate">
										{props.package?.name}
									</span>
								</div>
								<div class="inset-0 absolute bg-gray-1 group-hover:opacity-20 opacity-0 transition-opacity duration-100" />
							</button>
						</div>
						<div>
							<span class="font-medium text-xs text-gray-11">Description</span>
							<p>Fires when the current program scene in OBS is changed.</p>
						</div>
					</div>
					<div class="flex flex-row h-7 border-t border-gray-5 divide-x divide-gray-5 text-center">
						<button
							type="button"
							disabled
							class={cx("flex-1 rounded-bl", focusRingClasses("inset"))}
						>
							More Info
						</button>
						<Popover.CloseButton
							ref={closeButton}
							autofocus
							class={cx("flex-1 rounded-br", focusRingClasses("inset"))}
						>
							Close
						</Popover.CloseButton>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	);
}
