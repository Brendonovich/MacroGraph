import type { Core } from "@macrograph/runtime";
import {
	GRAPH_KIND_LABELS,
	NODE_DROP_REASON_LABELS,
	type NodeSchemaRef,
	type ProjectLoadAnalysis,
	analyzeProjectLoad,
	applyAutoMigrations,
	deserializeProject,
	formatReplacementLabel,
	listReplacementSchemaOptions,
	nodeTypeKey,
	replacementOptionKey,
	sanitizeProjectForLoad,
	type serde,
} from "@macrograph/runtime-serde";
import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
} from "@macrograph/ui";
import clsx from "clsx";
import { For, Show, createMemo, createRoot, createSignal } from "solid-js";

import { createTokenisedSearchFilter, tokeniseString } from "./util";

type LoadConfirmResult = {
	replacements: Record<string, NodeSchemaRef | null>;
};

type PendingConfirmation = {
	core: Core;
	project: serde.Project;
	analysis: ProjectLoadAnalysis;
	printMigratedCount: number;
	resolve: (result: LoadConfirmResult | null) => void;
};

const [pending, setPending] = /*@once*/ createRoot(() =>
	createSignal<PendingConfirmation | null>(null),
);

export function requestProjectLoadConfirmation(
	core: Core,
	project: serde.Project,
	analysis: ProjectLoadAnalysis,
	printMigratedCount: number,
): Promise<LoadConfirmResult | null> {
	if (!analysis.hasIssues) return Promise.resolve({ replacements: {} });

	return new Promise((resolve) => {
		setPending({ core, project, analysis, printMigratedCount, resolve });
	});
}

function closePending(result: LoadConfirmResult | null) {
	const current = pending();
	if (!current) return;
	current.resolve(result);
	setPending(null);
}

type ReplacementListItem =
	| { kind: "remove"; label: string }
	| {
			kind: "option";
			label: string;
			ref: NodeSchemaRef & { label: string };
	  };

function ReplacementPicker(props: {
	core: Core;
	project: serde.Project;
	type: ProjectLoadAnalysis["uniqueDroppedTypes"][number];
	value: NodeSchemaRef | null;
	onChange: (value: NodeSchemaRef | null) => void;
}) {
	const [picking, setPicking] = createSignal(true);
	const [search, setSearch] = createSignal("");

	const options = createMemo(() =>
		listReplacementSchemaOptions(
			props.core,
			props.project,
			props.type.reason,
		),
	);

	const searchableItems = createMemo((): Array<[string[], ReplacementListItem]> => {
		const remove: ReplacementListItem = {
			kind: "remove",
			label: "Don't replace (remove)",
		};
		return [
			[tokeniseString(remove.label), remove],
			...options().map((opt) => {
				const item: ReplacementListItem = {
					kind: "option",
					label: opt.label,
					ref: opt,
				};
				return [tokeniseString(opt.label), item] as [string[], ReplacementListItem];
			}),
		];
	});

	const filteredItems = createTokenisedSearchFilter(search, searchableItems);

	const selectedKey = () =>
		props.value ? replacementOptionKey(props.value) : "";

	const selectedLabel = createMemo(() => {
		if (props.value) return formatReplacementLabel(props.project, props.value);
		return "Don't replace (remove)";
	});

	const isRemoveChoice = () => !props.value;

	const pick = (item: ReplacementListItem) => {
		if (item.kind === "remove") {
			props.onChange(null);
		} else {
			props.onChange({
				package: item.ref.package,
				id: item.ref.id,
				properties: item.ref.properties,
			});
		}
		setPicking(false);
		setSearch("");
	};

	const openPicker = () => {
		setPicking(true);
		setSearch("");
	};

	const isSelected = (item: ReplacementListItem) => {
		if (item.kind === "remove") return !props.value;
		return props.value
			? replacementOptionKey(item.ref) === selectedKey()
			: false;
	};

	return (
		<div class="rounded border border-neutral-700 bg-neutral-950/60 p-3 space-y-2">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<span class="font-mono text-sm text-neutral-200">
					{props.type.package}/{props.type.schemaId}
				</span>
				<span class="text-xs text-neutral-500">
					({props.type.nodeCount} node{props.type.nodeCount === 1 ? "" : "s"})
				</span>
			</div>
			<p class="text-xs text-neutral-500">
				{NODE_DROP_REASON_LABELS[props.type.reason]}
			</p>
			<div class="flex flex-col gap-1.5">
				<span class="text-xs text-neutral-400">Replace with</span>
				<Show
					when={picking()}
					fallback={
						<div
							class={clsx(
								"flex items-start gap-2 rounded-md border px-3 py-2.5",
								isRemoveChoice()
									? "border-amber-800/60 bg-amber-950/30"
									: "border-emerald-800/60 bg-emerald-950/30",
							)}
						>
							<Show
								when={!isRemoveChoice()}
								fallback={
									<span class="mt-0.5 shrink-0 text-amber-400/90" aria-hidden>
										×
									</span>
								}
							>
								<IconTablerCheck class="mt-0.5 size-4 shrink-0 text-emerald-400" />
							</Show>
							<div class="min-w-0 flex-1">
								<p
									class={clsx(
										"text-[10px] font-medium uppercase tracking-wide",
										isRemoveChoice()
											? "text-amber-500/90"
											: "text-emerald-500/90",
									)}
								>
									{isRemoveChoice() ? "Will remove" : "Will replace with"}
								</p>
								<p
									class={clsx(
										"text-sm font-medium leading-snug",
										isRemoveChoice() ? "text-amber-100" : "text-emerald-100",
									)}
								>
									{selectedLabel()}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								class="shrink-0 h-7 text-xs border-neutral-600"
								onClick={openPicker}
							>
								Change
							</Button>
						</div>
					}
				>
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-2">
							<Input
								type="search"
								placeholder="Search nodes…"
								class="h-8 flex-1 border-neutral-600 bg-neutral-900 text-sm text-neutral-100 placeholder:text-neutral-500"
								value={search()}
								onInput={(e) => setSearch(e.currentTarget.value)}
								autofocus
							/>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-8 shrink-0 px-2 text-xs text-neutral-400"
								onClick={() => {
									setPicking(false);
									setSearch("");
								}}
							>
								Cancel
							</Button>
						</div>
						<div
							class="max-h-36 overflow-y-auto rounded border border-neutral-700 bg-neutral-900/80"
							role="listbox"
						>
							<For each={filteredItems()}>
								{(item) => (
									<button
										type="button"
										role="option"
										aria-selected={isSelected(item)}
										class={clsx(
											"w-full px-2 py-1.5 text-left text-xs transition-colors",
											isSelected(item)
												? "bg-cyan-900/40 text-cyan-100"
												: "text-neutral-300 hover:bg-neutral-800",
											item.kind === "remove" && "text-neutral-400 italic",
										)}
										onClick={() => pick(item)}
									>
										{item.label}
									</button>
								)}
							</For>
							<Show when={filteredItems().length === 0}>
								<p class="px-2 py-2 text-xs text-neutral-500">
									No matching nodes
								</p>
							</Show>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
}

function LoadCheckerDialogContent(props: PendingConfirmation) {
	const analysis = () => props.analysis;
	const [replacements, setReplacements] = createSignal<
		Record<string, NodeSchemaRef | null>
	>(
		Object.fromEntries(
			props.analysis.uniqueDroppedTypes.map((t) => [t.key, null]),
		),
	);

	const setReplacement = (key: string, value: NodeSchemaRef | null) => {
		setReplacements((prev) => ({ ...prev, [key]: value }));
	};

	const replacedTypeCount = createMemo(() =>
		analysis().uniqueDroppedTypes.filter((t) => replacements()[t.key]).length,
	);

	const removedNodeCount = createMemo(() =>
		analysis().uniqueDroppedTypes.reduce(
			(sum, type) => (replacements()[type.key] ? sum : sum + type.nodeCount),
			0,
		),
	);

	return (
						<DialogContent
							class="w-[min(92vw,44rem)] max-w-none max-h-[min(85vh,36rem)] flex flex-col gap-0 p-0 bg-neutral-900 border-neutral-700"
							onOpenAutoFocus={(e) => e.preventDefault()}
						>
							<DialogHeader class="flex flex-row items-center justify-between px-4 py-3 border-b border-neutral-700 shrink-0">
								<DialogTitle class="text-base text-neutral-100">
									Project compatibility issues
								</DialogTitle>
								<DialogCloseButton />
							</DialogHeader>

							<div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 text-sm text-neutral-300">
								<Show when={props.printMigratedCount > 0}>
									<p class="text-xs text-emerald-400/90 rounded border border-emerald-900/50 bg-emerald-950/30 px-3 py-2">
										Auto-converted {props.printMigratedCount} legacy Print node
										{props.printMigratedCount === 1 ? "" : "s"} to Console Log.
									</p>
								</Show>

								<p>
									This project was saved with an older or incompatible version.
									{replacedTypeCount() > 0 ? (
										<>
											{" "}
											<span class="text-emerald-300 font-medium">
												{replacedTypeCount()} type
												{replacedTypeCount() === 1 ? "" : "s"}
											</span>{" "}
											will be replaced.
										</>
									) : null}
									{removedNodeCount() > 0 ? (
										<>
											{" "}
											<span class="text-amber-300 font-medium">
												{removedNodeCount()} node
												{removedNodeCount() === 1 ? "" : "s"}
											</span>{" "}
											will be removed
										</>
									) : null}
									{analysis().orphanConnectionCount > 0 ? (
										<>
											{" "}
											and{" "}
											<span class="text-amber-300 font-medium">
												{analysis().orphanConnectionCount} connection
												{analysis().orphanConnectionCount === 1 ? "" : "s"}
											</span>{" "}
											dropped
										</>
									) : null}
									.
								</p>

								<Show when={analysis().uniqueDroppedTypes.length > 0}>
									<div class="space-y-2">
										<h3 class="text-xs font-medium uppercase tracking-wide text-neutral-500">
											Replacement mapping
										</h3>
										<For each={analysis().uniqueDroppedTypes}>
											{(type) => (
												<ReplacementPicker
													core={props.core}
													project={props.project}
													type={type}
													value={replacements()[type.key] ?? null}
													onChange={(value) =>
														setReplacement(type.key, value)
													}
												/>
											)}
										</For>
									</div>
								</Show>

								<div class="space-y-2">
									<h3 class="text-xs font-medium uppercase tracking-wide text-neutral-500">
										Affected nodes by graph
									</h3>
									<For each={analysis().graphs}>
										{(graphIssues) => (
											<div class="rounded border border-neutral-700 bg-neutral-950/40 p-3">
												<p class="font-medium text-neutral-100 mb-2">
													{GRAPH_KIND_LABELS[graphIssues.graphKind]}:{" "}
													{graphIssues.graphName}
												</p>
												<ul class="space-y-1.5 text-xs">
													<For each={graphIssues.droppedNodes}>
														{(node) => {
															const key = nodeTypeKey(
																node.package,
																node.schemaId,
															);
															const replacement = () =>
																replacements()[key];
															return (
																<li class="text-neutral-400">
																	<span class="text-neutral-200">
																		{node.nodeName}
																	</span>{" "}
																	<span class="font-mono text-neutral-500">
																		({node.package}/{node.schemaId})
																	</span>
																	{replacement() ? (
																		<span class="block text-emerald-500/90">
																			→{" "}
																			{formatReplacementLabel(
																				props.project,
																				replacement()!,
																			)}
																		</span>
																	) : (
																		<span class="block text-amber-500/90">
																			Will be removed
																		</span>
																	)}
																</li>
															);
														}}
													</For>
												</ul>
											</div>
										)}
									</For>
								</div>
							</div>

							<DialogFooter class="px-4 py-3 border-t border-neutral-700 shrink-0 gap-2 sm:justify-end">
								<Button
									type="button"
									variant="outline"
									onClick={() => closePending(null)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={() =>
										closePending({ replacements: replacements() })
									}
								>
									Load anyway
								</Button>
							</DialogFooter>
						</DialogContent>
	);
}

export function LoadCheckerDialog() {
	return (
		<Dialog
			open={!!pending()}
			onOpenChange={(open) => {
				if (!open) closePending(null);
			}}
			modal
		>
			<Show when={pending()} keyed>
				{(p) => <LoadCheckerDialogContent {...p()} />}
			</Show>
		</Dialog>
	);
}

export async function loadParsedProject(
	core: Core,
	parsed: serde.Project,
	options?: {
		skipConfirmation?: boolean;
		onAfterLoad?: (data: serde.Project) => Promise<void>;
	},
): Promise<boolean> {
	const { project: migrated, printMigratedCount } = applyAutoMigrations(parsed);
	const analysis = analyzeProjectLoad(core, migrated);

	if (analysis.hasIssues && !options?.skipConfirmation) {
		const result = await requestProjectLoadConfirmation(
			core,
			migrated,
			analysis,
			printMigratedCount,
		);
		if (!result) return false;

		const data = sanitizeProjectForLoad(
			core,
			migrated,
			result.replacements,
		);
		await core.load((c) => deserializeProject(c, data));
		await options?.onAfterLoad?.(data);
		return true;
	}

	await core.load((c) => deserializeProject(c, migrated));
	await options?.onAfterLoad?.(migrated);
	return true;
}
