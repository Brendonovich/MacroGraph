import {
	type Node,
	rerunNodeFromInvocationSnapshot,
	remoteHostRpcRequest,
	graphRefOf,
} from "@macrograph/runtime";
import type { ParentProps } from "solid-js";
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { toast } from "solid-sonner";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";
import {
	MAX_NODE_INVOCATIONS,
	type EntryType,
	type StoredNodeInvocation,
} from "../../nodeInvocationLog";
import { usePlatform } from "../../platform";

function Field(props: ParentProps<{ name: string }>) {
	return (
		<div class="flex flex-col gap-0.5 leading-5">
			<label class="text-sm font-medium text-gray-200">{props.name}</label>
			<span class="text-sm text-neutral-300">{props.children}</span>
		</div>
	);
}

function JsonBlock(props: { label: string; value: unknown }) {
	return (
		<div class="flex flex-col gap-1">
			<span class="text-sm font-medium text-gray-200">{props.label}</span>
			<pre class="max-h-40 overflow-y-auto rounded-sm border border-neutral-700 bg-neutral-900 p-1.5 font-mono text-[13px] leading-snug text-neutral-200 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-600">
				{JSON.stringify(props.value, null, 2)}
			</pre>
		</div>
	);
}

function formatInvocationErrorText(err: NonNullable<StoredNodeInvocation["error"]>) {
	const stack = err.stack?.trim();
	if (stack) return stack;
	return err.message;
}

const typeFilterOptions: EntryType[] = ["invocation", "log", "warn", "error"];

const typeFilterLabels: Record<EntryType, string> = {
	invocation: "Invocations",
	log: "Logs",
	warn: "Warnings",
	error: "Errors",
};

const entryStyles: Record<string, string> = {
	invocation: "bg-black/30",
	log: "bg-black/30",
	warn: "bg-orange-950/50",
	error: "bg-red-950/50",
};

export function NodeInfo(props: { node: Node }) {
	const ctx = useInterfaceContext();
	const platform = usePlatform();
	const [rerunningId, setRerunningId] = createSignal<string | null>(null);
	const [activeFilters, setActiveFilters] = createSignal<Set<EntryType>>(
		new Set(typeFilterOptions),
	);

	function toggleFilter(type: EntryType) {
		setActiveFilters((prev) => {
			const next = new Set(prev);
			if (next.has(type)) next.delete(type);
			else next.add(type);
			return next;
		});
	}

	const entries = createMemo(() => {
		const all = ctx.getNodeInvocationEntries(
			graphRefOf(props.node.graph),
			props.node.id,
		);
		const active = activeFilters();
		return all.filter((e) => active.has(e.entryType));
	});

	async function rerun(inv: StoredNodeInvocation) {
		if (inv.entryType !== "invocation") return;
		setRerunningId(inv.id);
		try {
			if (props.node.graph.project.core.remoteShell) {
				await remoteHostRpcRequest({
					method: "rerunNode",
					params: {
						...graphRefOf(props.node.graph),
						nodeId: props.node.id,
						inputs: inv.inputs,
						eventData: inv.eventData,
					},
				});
			} else {
				await rerunNodeFromInvocationSnapshot(props.node, {
					inputs: inv.inputs!,
					eventData: inv.eventData,
				});
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			setRerunningId(null);
		}
	}

	async function copyInvocationError(err: NonNullable<StoredNodeInvocation["error"]>) {
		try {
			await platform.clipboard.writeText(formatInvocationErrorText(err));
			toast.success("Error copied to clipboard");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	}

	createEffect(
		on(
			() =>
				[
					ctx.invocationWorkspaceKey(),
					props.node.graph.id,
					props.node.id,
					props.node.state.trackInvocations,
				] as const,
			([, , nodeId, tracking]) => {
				if (!tracking) return;

				void ctx.hydrateNodeInvocationLog(graphRefOf(props.node.graph), nodeId);

				if (props.node.graph.project.core.remoteShell) {
					const ref = graphRefOf(props.node.graph);
					remoteHostRpcRequest({
						method: "getNodeInvocations",
						params: { ...ref, nodeId },
					})
						.then((result) => {
							ctx.setNodeInvocationEntries(
								ref,
								nodeId,
								(result as { entries: StoredNodeInvocation[] }).entries,
							);
						})
						.catch((e) =>
							console.error("Failed to fetch node invocations", e),
						);
				}
			},
		),
	);

	return (
		<>
			<SidebarSection title="Node Info" class="p-2 space-y-2">
				<Field name="Name">{props.node.state.name}</Field>
				<Field name="Schema">{props.node.schema.name}</Field>
				<Field name="Schema Package">{props.node.schema.package.name}</Field>
				<label class="flex flex-row items-center gap-2 pt-1 cursor-pointer">
					<input
						type="checkbox"
						class="rounded border-neutral-600 bg-neutral-800"
						checked={props.node.state.trackInvocations}
						onChange={(e) => {
							ctx.execute("setNodeTrackInvocations", {
								...graphRefOf(props.node.graph),
								nodeId: props.node.id,
								trackInvocations: e.currentTarget.checked,
							});
						}}
					/>
					<span class="text-sm text-neutral-300">Track invocations</span>
				</label>
			</SidebarSection>

			<SidebarSection
				title={`Node History (last ${MAX_NODE_INVOCATIONS})`}
				class="flex min-h-0 flex-col overflow-hidden p-0"
			>
				<Show
					when={props.node.state.trackInvocations}
					fallback={
						<p class="p-3 text-sm text-neutral-500">
							Enable &quot;Track invocations&quot; above to record runs for this
							node. Tracking is off by default to save memory during high event
							rates.
						</p>
					}
				>
				<div class="flex flex-row gap-1 p-1 border-b border-neutral-900">
					<For each={typeFilterOptions}>
						{(type) => (
							<button
								type="button"
								class={`px-2 py-0.5 text-xs rounded ${
									activeFilters().has(type)
										? "bg-neutral-600 text-white"
										: "text-neutral-500 hover:text-neutral-200"
								}`}
								onClick={() => toggleFilter(type)}
							>
								{typeFilterLabels[type]}
							</button>
						)}
					</For>
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-600">
					<ul class="flex flex-col gap-y-2 p-1">
						<For each={entries()}>
							{(inv) => (
								<li class={`rounded-md px-2 py-2 ${entryStyles[inv.entryType] ?? "bg-black/30"}`}>
									<div class="mb-1.5 flex flex-row flex-wrap items-center justify-between gap-2 text-sm text-neutral-400">
										<div class="flex min-w-0 flex-wrap items-center gap-2">
											<span class="font-mono text-[13px] text-neutral-300">
												{new Date(inv.startedAt).toLocaleString()}
											</span>
											{inv.entryType === "invocation" ? (
												<span
													class={
														inv.ok
															? "rounded-sm bg-neutral-800/90 px-1.5 py-0.5 text-[13px] font-medium text-neutral-200"
															: "rounded-sm bg-red-950/50 px-1.5 py-0.5 text-[13px] font-medium text-red-300"
													}
												>
													{inv.ok ? "ok" : "error"}
												</span>
											) : (
												<span
													class={`rounded-sm px-1.5 py-0.5 text-[13px] font-medium ${
														inv.entryType === "warn"
															? "bg-orange-950/50 text-orange-300"
															: inv.entryType === "error"
																? "bg-red-950/50 text-red-300"
																: "bg-neutral-800/90 text-neutral-200"
													}`}
												>
													{inv.entryType}
												</span>
											)}
										</div>
										{inv.entryType === "invocation" ? (
											<div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
												<button
													type="button"
													class="rounded-sm border border-neutral-600 bg-neutral-800/80 px-2 py-0.5 text-[13px] font-medium text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
													disabled={rerunningId() === inv.id}
													onClick={() => void rerun(inv)}
												>
													{rerunningId() === inv.id ? "…" : "Rerun"}
												</button>
												<span class="font-mono text-[13px] text-neutral-500">
													{inv.durationMs} ms
												</span>
											</div>
										) : null}
									</div>
									{inv.consoleMessage ? (
										<p class="text-sm break-words text-white">
											{inv.consoleMessage}
										</p>
									) : null}
									{inv.entryType === "invocation" && inv.error ? (
										<div class="mb-1.5 rounded-sm border border-neutral-800 bg-neutral-900/80 p-2 text-sm text-white">
											<div class="mb-1 flex flex-row flex-wrap items-start justify-between gap-2">
												<div class="min-w-0 flex-1 font-medium text-red-200">
													{inv.error.message}
												</div>
												<button
													type="button"
													class="shrink-0 rounded-sm border border-neutral-600 bg-neutral-800/80 px-2 py-0.5 text-[13px] font-medium text-neutral-100 hover:bg-neutral-700"
													onClick={() => {
														const err = inv.error;
														if (err) void copyInvocationError(err);
													}}
												>
													Copy
												</button>
											</div>
											{inv.error.stack ? (
												<pre class="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[12px] leading-snug text-red-300/85 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-600">
													{inv.error.stack}
												</pre>
											) : null}
										</div>
									) : null}
									{inv.entryType === "invocation" ? (
										<div class="space-y-2">
											{inv.eventData !== undefined ? (
												<JsonBlock label="Event data" value={inv.eventData} />
											) : null}
											{inv.inputs ? <JsonBlock label="Inputs" value={inv.inputs} /> : null}
											{inv.outputs ? <JsonBlock label="Outputs" value={inv.outputs} /> : null}
										</div>
									) : null}
								</li>
							)}
						</For>
						<Show when={entries().length === 0}>
							<li class="px-2 py-6 text-center text-sm text-neutral-400">
								No recorded entries for this node yet.
							</li>
						</Show>
					</ul>
				</div>
				</Show>
			</SidebarSection>
		</>
	);
}
