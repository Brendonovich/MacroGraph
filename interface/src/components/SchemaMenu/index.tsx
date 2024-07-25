import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type NodeSchema,
	type NodeSchemaVariant,
	type Pin,
	ScopeInput,
	ScopeOutput,
	type XY,
	pinIsOutput,
	renderedTypesCompatible,
} from "@macrograph/runtime";
import { type RenderedIO, renderType } from "@macrograph/runtime";
import { createWritableMemo } from "@solid-primitives/memo";
import clsx from "clsx";
import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import { useCore } from "../../contexts";
import type { GraphState } from "../Graph/Context";

interface Props {
	graph: GraphState;
	onSchemaClicked(
		s: NodeSchema,
		suggestion?: { pin: number },
	): void | Promise<void>;
	onCreateCommentBox(): void;
	position: XY;
	suggestion?: { pin: Pin };
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

	const [search, setSearch] = createSignal("");

	const lowercaseSearchTokens = createMemo(() =>
		search()
			.toLowerCase()
			.split(" ")
			.filter((s) => s !== ""),
	);

	let searchRef: HTMLInputElement;

	onMount(() => searchRef.focus());

	const sortedPackages = createMemo(() =>
		core.packages.sort((a, b) => a.name.localeCompare(b.name)),
	);

	return (
		<div
			class="flex flex-col bg-neutral-900 border-black text-white border absolute z-10 w-80 h-[30rem] rounded-xl shadow-md overflow-hidden text-sm animate-in zoom-in-95 origin-top-left transition-none fade-in duration-100"
			style={{
				left: `${props.position.x - 18}px`,
				top: `${props.position.y - 18}px`,
			}}
		>
			<div class="p-2">
				<input
					ref={searchRef!}
					onInput={(e) => setSearch(e.target.value)}
					value={search()}
					class="h-6 w-full flex-1 bg-neutral-900 border-none rounded-sm text-xs !pl-1.5 focus-visible:outline-none focus:ring-1 focus:ring-mg-focus transition-colors"
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
					<Show when={search() === "" && !props.suggestion}>
						<button
							type="button"
							class="px-2 py-0.5 flex flex-row items-center space-x-2 hover:bg-neutral-700 min-w-full text-left rounded-md"
							onClick={props.onCreateCommentBox}
						>
							Add Comment Box
						</button>
					</Show>
					<For each={sortedPackages()}>
						{(p) => {
							const [open, setOpen] = createWritableMemo(
								() => props.suggestion !== undefined || search() !== "",
							);

							const filteredSchemas = createMemo(() => {
								if (p.schemas.size < 1) return [];

								const lowercasePackageName = p.name.toLowerCase();

								const leftoverSearchTokens = lowercaseSearchTokens().filter(
									(s) => !lowercasePackageName.startsWith(s),
								);

								const ret: {
									schema: NodeSchema;
									suggestion?: { pin: number };
								}[] = [];

								for (const schema of p.schemas.values()) {
									const lowercaseSchemaName = schema.name.toLowerCase();

									const searchMatches = leftoverSearchTokens.every((t) =>
										lowercaseSchemaName.includes(t),
									);

									if (searchMatches) {
										if (props.suggestion) {
											if ("type" in schema && schema.rendered) {
												const { pin } = props.suggestion;

												if (pinIsOutput(pin)) {
													if (pin instanceof ExecOutput) {
														const index = schema.rendered.inputs.findIndex(
															(i) => i.variant === "exec",
														);
														if (index !== -1)
															ret.push({ schema, suggestion: { pin: index } });
													} else if (pin instanceof DataOutput) {
														const renderedType = renderType(pin.type);
														if (!renderedType) continue;

														const index = schema.rendered.inputs.findIndex(
															(i) => i.variant === "data",
														);
														const input = schema.rendered.inputs[index] as
															| Extract<RenderedIO, { variant: "data" }>
															| undefined;

														if (
															input &&
															(renderedType === "wildcard" ||
																input.type === "wildcard" ||
																renderedTypesCompatible(
																	input.type,
																	renderedType,
																))
														)
															ret.push({ schema, suggestion: { pin: index } });
													} else if (pin instanceof ScopeOutput) {
														const index = schema.rendered.inputs.findIndex(
															(i) => i.variant === "scope",
														);
														if (index !== -1)
															ret.push({ schema, suggestion: { pin: index } });
													}
												} else {
													if (pin instanceof ExecInput) {
														const index = schema.rendered.outputs.findIndex(
															(i) => i.variant === "exec",
														);
														if (index !== -1)
															ret.push({ schema, suggestion: { pin: index } });
													} else if (pin instanceof DataInput) {
														const renderedType = renderType(pin.type);
														if (!renderedType) continue;

														const index = schema.rendered.outputs.findIndex(
															(o) => o.variant === "data",
														);
														const output = schema.rendered.outputs[index] as
															| Extract<RenderedIO, { variant: "data" }>
															| undefined;
														if (
															output &&
															(renderedType === "wildcard" ||
																output.type === "wildcard" ||
																renderedTypesCompatible(
																	output.type,
																	renderedType,
																))
														)
															ret.push({ schema, suggestion: { pin: index } });
													} else if (pin instanceof ScopeInput) {
														const index = schema.rendered.outputs.findIndex(
															(i) => i.variant === "scope",
														);
														if (index !== -1)
															ret.push({ schema, suggestion: { pin: index } });
													}
												}
											}
										} else ret.push({ schema });
									}
								}

								return ret;
							});

							return (
								<Show when={filteredSchemas().length !== 0}>
									<div>
										<button
											type="button"
											class="px-1 py-0.5 flex flex-row items-center space-x-1 hover:bg-neutral-700 min-w-full text-left rounded-md"
											onClick={() => setOpen(!open())}
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
													{({ schema, suggestion }) => (
														<div>
															<button
																type="button"
																class="px-2 py-0.5 flex flex-row items-center space-x-2 whitespace-nowrap min-w-full text-left hover:bg-neutral-700 rounded-lg"
																onClick={() =>
																	props.onSchemaClicked(schema, suggestion)
																}
															>
																<div
																	class={clsx(
																		"h-3 w-3 rounded-full",
																		TypeIndicatorColours[
																			"variant" in schema
																				? schema.variant
																				: "type" in schema
																					? schema.type
																					: "Event"
																		],
																	)}
																/>
																<span>{schema.name}</span>
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
