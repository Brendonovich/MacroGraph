import type { Package, Schema } from "@macrograph/project-domain";
import { focusRingClasses } from "@macrograph/ui";
import { createContextProvider } from "@solid-primitives/context";
import { createEventListener } from "@solid-primitives/event-listener";
import { createWritableMemo } from "@solid-primitives/memo";
import { cx } from "cva";
import {
	type ComponentProps,
	createMemo,
	createSignal,
	For,
	onMount,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import createPresence from "solid-presence";

import { useGraphContext } from "./Context";

export type GraphContextMenuState =
	| { open: false }
	| { open: true; position: { x: number; y: number }; paneId: number };

const [Provider, useContext_] = createContextProvider(() => {
	return createSignal<GraphContextMenuState>({ open: false });
});

const useContext = () => {
	const ctx = useContext_();
	if (!ctx) throw new Error("GraphContextMenu must be used inside a Provider!");
	return ctx;
};

export const GraphContextMenu = Object.assign(
	(props: {
		onSchemaClick: (
			schema: Schema.Ref,
			position: { x: number; y: number },
		) => void;
		packages: Record<string, Package.Package>;
	}) => {
		const [state, setState] = useContext();

		const position = () => {
			const s = state();
			if (s.open) return s.position;
			return null;
		};

		const graphCtx = useGraphContext();

		const [ref, setRef] = createSignal<HTMLElement | null>(null);

		const schemaMenuPresence = createPresence({
			show: () => position() !== null,
			element: ref,
		});

		const schemaMenuPosition = createMemo(
			(prev: { x: number; y: number } | undefined) => {
				const m = position();
				if (m !== null) return m;
				return prev;
			},
		);

		return (
			<Show when={schemaMenuPresence.present() && schemaMenuPosition()}>
				{(position) => {
					const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(
						null,
					);
					const [search, setSearch] = createSignal<string>("");

					onMount(() => inputRef()?.focus());

					createEventListener(window, "keydown", (e) => {
						e.stopPropagation();

						switch (e.code) {
							case "Escape": {
								setState({ open: false });
								break;
							}
							default:
								return;
						}

						e.preventDefault();
					});

					const lowercaseSearchTokens = createMemo(() =>
						search()
							.toLowerCase()
							.split(" ")
							.filter((s) => s !== ""),
					);

					const filteredPackages = createMemo(() => {
						const tokens = lowercaseSearchTokens();

						const packages = Object.entries(props.packages).map(([, pkg]) => {
							const lowercasePackageName = pkg.name.toLowerCase();

							const leftoverSearchTokens = tokens.filter(
								(s) => !lowercasePackageName.startsWith(s),
							);

							const matchingSchemas = [...pkg.schemas.entries()].filter(
								([, schema]) => {
									if (leftoverSearchTokens.length === 0) return true;
									const lowercaseSchemaName = (schema.name ?? "").toLowerCase();
									return leftoverSearchTokens.every((t) =>
										lowercaseSchemaName.includes(t),
									);
								},
							);

							matchingSchemas.sort((a, b) => {
								const aName = a[1].name ?? a[0];
								const bName = b[1].name ?? b[0];
								return aName.localeCompare(bName);
							});

							return { pkg, schemas: matchingSchemas };
						});

						packages.sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));

						return { packages, hasSearch: tokens.length > 0 };
					});

					return (
						<Portal>
							<div
								ref={setRef}
								data-open={position() !== null}
								class={cx(
									"absolute flex flex-col bg-gray-3 border border-gray-5 text-sm w-72 h-[22rem] rounded overflow-hidden",
									"origin-top-left data-[open='true']:(animate-in fade-in zoom-in-95) data-[open='false']:(animate-out fade-out zoom-out-95)",
								)}
								style={{
									left: `${position().x - 16}px`,
									top: `${position().y - 16}px`,
								}}
							>
								<input
									ref={setInputRef}
									type="text"
									class={cx(
										"bg-transparent p-1.5 text-xs bg-gray-2 border-b border-gray-5 rounded-t",
										focusRingClasses("inset"),
									)}
									placeholder="Search Nodes..."
									value={search()}
									onInput={(e) => setSearch(e.currentTarget.value)}
									onKeyDown={(e) => e.stopPropagation()}
									onKeyUp={(e) => e.stopPropagation()}
								/>
								<div class="overflow-y-auto">
									<div class="p-1">
										<For each={filteredPackages().packages}>
											{({ pkg, schemas }) => {
												const [open, setOpen] = createWritableMemo(
													() => search() !== "",
												);

												return (
													<Show
														when={
															!filteredPackages().hasSearch ||
															schemas.length > 0
														}
													>
														<div class="flex flex-col items-stretch">
															<ItemButton
																type="button"
																onClick={() => setOpen(!open())}
																class="group gap-0.5 pl-0.5"
																data-open={open()}
															>
																<IconMaterialSymbolsArrowRightRounded class="size-5 -my-1 -mr-0.5 group-data-[open='true']:rotate-90 transition-transform" />
																<span>{pkg.name}</span>
															</ItemButton>
															<Show when={open()}>
																<div class="pl-2">
																	<For each={schemas}>
																		{([schemaId, schema]) => (
																			<ItemButton
																				class="gap-1.5 pl-1.5"
																				onClick={() => {
																					props.onSchemaClick(
																						{ pkg: pkg.id, id: schemaId },
																						graphCtx.getGraphPosition({
																							x: position().x - 16,
																							y: position().y - 16,
																						}),
																					);
																					setState({ open: false });
																				}}
																			>
																				<div
																					class={cx(
																						"size-3 bg-mg-event rounded-full shrink-0",
																						TypeIndicatorColours[schema.type],
																					)}
																				/>
																				{schema.name ?? schemaId}
																			</ItemButton>
																		)}
																	</For>
																</div>
															</Show>
														</div>
													</Show>
												);
											}}
										</For>
									</div>
								</div>
							</div>
						</Portal>
					);
				}}
			</Show>
		);
	},
	{ Provider, useContext },
);

const ItemButton = (props: ComponentProps<"button">) => (
	<button
		type="button"
		{...props}
		class={cx(
			"flex flex-row py-0.5 items-center w-full text-left @hover-bg-gray-6/10 rounded",
			focusRingClasses("inset"),
			props.class,
		)}
	/>
);

const TypeIndicatorColours: Record<Schema.Type, string> = {
	base: "bg-mg-base",
	exec: "bg-mg-exec",
	event: "bg-mg-event",
	pure: "bg-mg-pure",
};
