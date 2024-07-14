import type {
	EventsMap,
	NodeSchema,
	NodeSchemaVariant,
	Package,
	XY,
} from "@macrograph/runtime";
import clsx from "clsx";
import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import { useCore } from "../contexts";
import type { GraphState } from "./Graph";

interface Props {
	graph: GraphState;
	onSchemaClicked(s: NodeSchema): void | Promise<void>;
	onCreateCommentBox(): void;
	position: XY;
}

const TypeIndicatorColours: Record<NodeSchemaVariant, string> = {
	Base: "bg-mg-base",
	Exec: "bg-mg-exec",
	Event: "bg-mg-event",
	Pure: "bg-mg-pure",
	base: "bg-mg-base",
	exec: "bg-mg-exec",
	event: "bg-mg-event",
	pure: "bg-mg-pure",
};

export function SchemaMenu(props: Props) {
	const core = useCore();

	const [openPackages, setOpenPackages] = createSignal(new Set<Package>());
	const [search, setSearch] = createSignal("");

	const lowercaseSearchTokens = createMemo(() =>
		search()
			.toLowerCase()
			.split(" ")
			.filter((s) => s !== ""),
	);

	let searchRef: HTMLInputElement;

	onMount(() => searchRef.focus());

	return (
		<div
			class="flex flex-col bg-neutral-900 border-black text-white border absolute z-10 w-80 h-[30rem] rounded-xl shadow-md overflow-hidden text-sm animate-in zoom-in-95 origin-top-left transition-none fade-in duration-100"
			style={{
				left: `${props.position.x}px`,
				top: `${props.position.y}px`,
			}}
		>
			<div class="p-2">
				<input
					ref={searchRef!}
					onInput={(e) => setSearch(e.target.value)}
					value={search()}
					class="h-6 w-full flex-1 bg-neutral-900 border-none rounded-sm text-xs !pl-1.5 focus-visible:outline-none focus:ring-1 focus:ring-yellow-500 transition-colors"
					placeholder="Search Nodes..."
					autocomplete="false"
					autoCapitalize="off"
					autocorrect="off"
					spellcheck={false}
					tabindex={0}
				/>
			</div>
			<div class="p-2 pt-0 flex-1 overflow-auto">
				<div>
					<Show when={search() === ""}>
						<button
							type="button"
							class="px-2 py-0.5 flex flex-row items-center space-x-2 hover:bg-neutral-700 min-w-full text-left rounded-md"
							onClick={props.onCreateCommentBox}
						>
							Add Comment Box
						</button>
					</Show>
					<For each={core.packages}>
						{(p) => {
							const open = () => openPackages().has(p) || search() !== "";

							const filteredSchemas = createMemo(() => {
								if (p.schemas.size < 1) return [];

								const lowercasePackageName = p.name.toLowerCase();

								const leftoverSearchTokens = lowercaseSearchTokens().filter(
									(s) => !lowercasePackageName.startsWith(s),
								);

								const ret: NodeSchema<EventsMap>[] = [];

								for (const schema of p.schemas) {
									const lowercaseSchemaName = schema.name.toLowerCase();

									if (
										leftoverSearchTokens.every((t) =>
											lowercaseSchemaName.includes(t),
										)
									)
										ret.push(schema as any);
								}

								return ret;
							});

							return (
								<Show when={filteredSchemas().length !== 0}>
									<div>
										<button
											type="button"
											class="px-1 py-0.5 flex flex-row items-center space-x-1 hover:bg-neutral-700 min-w-full text-left rounded-md"
											onClick={() =>
												setOpenPackages((s) => {
													if (s.has(p)) s.delete(p);
													else s.add(p);

													return new Set(s);
												})
											}
										>
											<IconMaterialSymbolsArrowRightRounded
												class="size-4 scale-125 transform transition-transform"
												classList={{ "rotate-90": open() }}
											/>
											<span>{p.name}</span>
										</button>
										<Show when={open()}>
											<div class="pl-4">
												<For each={filteredSchemas()}>
													{(s) => (
														<div>
															<button
																type="button"
																class="px-2 py-0.5 flex flex-row items-center space-x-2 whitespace-nowrap min-w-full text-left hover:bg-neutral-700 rounded-lg"
																onClick={() => props.onSchemaClicked(s)}
															>
																<div
																	class={clsx(
																		"h-3 w-3 rounded-full",
																		TypeIndicatorColours[
																			"variant" in s
																				? s.variant
																				: "type" in s
																					? s.type
																					: "Event"
																		],
																	)}
																/>
																<span>{s.name}</span>
															</button>
														</div>
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
	);
}
