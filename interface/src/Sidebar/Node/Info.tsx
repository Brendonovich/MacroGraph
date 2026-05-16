import {
	type Node,
	rerunNodeFromInvocationSnapshot,
	remoteHostRpcRequest,
} from "@macrograph/runtime";
import type { ParentProps } from "solid-js";
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { toast } from "solid-sonner";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";
import {
	MAX_NODE_INVOCATIONS,
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

export function NodeInfo(props: { node: Node }) {
	const ctx = useInterfaceContext();
	const platform = usePlatform();
	const [rerunningId, setRerunningId] = createSignal<string | null>(null);

	const entries = createMemo(() =>
		ctx.getNodeInvocationEntries(props.node.graph.id, props.node.id),
	);

	async function rerun(inv: StoredNodeInvocation) {
		setRerunningId(inv.id);
		try {
			if (props.node.graph.project.core.remoteShell) {
				await remoteHostRpcRequest({
					method: "rerunNode",
					params: {
						graphId: props.node.graph.id,
						nodeId: props.node.id,
						inputs: inv.inputs,
						eventData: inv.eventData,
					},
				});
			} else {
				await rerunNodeFromInvocationSnapshot(props.node, {
					inputs: inv.inputs,
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
				] as const,
			() => {
				void ctx.hydrateNodeInvocationLog(
					props.node.graph.id,
					props.node.id,
				);
			},
		),
	);

	return (
		<>
			<SidebarSection title="Node Info" class="p-2 space-y-2">
				<Field name="Name">{props.node.state.name}</Field>
				<Field name="Schema">{props.node.schema.name}</Field>
				<Field name="Schema Package">{props.node.schema.package.name}</Field>
			</SidebarSection>

			<SidebarSection
				title={`Recent runs (last ${MAX_NODE_INVOCATIONS})`}
				class="flex min-h-0 flex-col overflow-hidden p-0"
			>
				<p class="shrink-0 border-b border-neutral-900 px-2 py-1.5 text-sm text-neutral-500">
					Full inputs and outputs are stored in IndexedDB for rerun. Rerun uses
					only cached pin values for that node (no live upstream reads); exec
					continues down the graph. Values that cannot be cloned use a JSON-safe
					fallback.
				</p>
				<div class="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-600">
					<ul class="flex flex-col gap-y-2 p-1">
						<For each={entries()}>
							{(inv) => (
								<li class="rounded-md bg-black/30 px-2 py-2">
									<div class="mb-1.5 flex flex-row flex-wrap items-center justify-between gap-2 text-sm text-neutral-400">
										<div class="flex min-w-0 flex-wrap items-center gap-2">
											<span class="font-mono text-[13px] text-neutral-300">
												{new Date(inv.startedAt).toLocaleString()}
											</span>
											<span
												class={
													inv.ok
														? "rounded-sm bg-neutral-800/90 px-1.5 py-0.5 text-[13px] font-medium text-neutral-200"
														: "rounded-sm bg-red-950/50 px-1.5 py-0.5 text-[13px] font-medium text-red-300"
												}
											>
												{inv.ok ? "ok" : "error"}
											</span>
										</div>
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
									</div>
									{inv.error ? (
										<div class="mb-1.5 rounded-sm border border-neutral-800 bg-neutral-900/80 p-2 text-sm text-red-300">
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
									<div class="space-y-2">
										{inv.eventData !== undefined ? (
											<JsonBlock label="Event data" value={inv.eventData} />
										) : null}
										<JsonBlock label="Inputs" value={inv.inputs} />
										<JsonBlock label="Outputs" value={inv.outputs} />
									</div>
								</li>
							)}
						</For>
						<Show when={entries().length === 0}>
							<li class="px-2 py-6 text-center text-sm text-neutral-400">
								No recorded runs for this node yet.
							</li>
						</Show>
					</ul>
				</div>
			</SidebarSection>
		</>
	);
}
