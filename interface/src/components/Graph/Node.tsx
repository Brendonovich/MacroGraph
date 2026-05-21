import { ContextMenu } from "@kobalte/core";
import type { Option } from "@macrograph/option";
import {
	DataInput as DataInputModel,
	DataOutput as DataOutputModel,
	ExecInput as ExecInputModel,
	ExecOutput as ExecOutputModel,
	NODE_EMIT,
	NODE_RUNNING,
	type Node as NodeModel,
	type NodeSchemaVariant,
	type OutputPin,
	ScopeInput as ScopeInputModel,
	ScopeOutput as ScopeOutputModel,
	hasConnection,
	splitIORef,
	graphRefOf,
} from "@macrograph/runtime";
import clsx from "clsx";
import * as Solid from "solid-js";
import { createContext, useContext } from "solid-js";

import {
	nodeToClipboardItem,
	serializeClipboardItem,
} from "@macrograph/clipboard";
import { toast } from "solid-sonner";
import { config } from "../../ConfigDialog";
import { useInterfaceContext } from "../../context";
import { isCtrlEvent } from "../../util";
import { useGraphContext } from "./Context";
import { estimateNodeBodyHeight } from "../../graphFastLoad";
import { ContextMenuContent, ContextMenuItem } from "./ContextMenu";
import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	ScopeInput,
	ScopeOutput,
} from "./IO";
import "./Node.css";
import { GRID_SIZE, handleSelectableItemPointerDown } from "./util";
import { isPaneResizing } from "../../paneResizeSession";
import { usePlatform } from "../../platform";

type NodeResizeBinding = {
	node: NodeModel;
	interfaceCtx: ReturnType<typeof useInterfaceContext>;
	onMeasured?: (width: number) => void;
};

const NODE_ESTIMATED_WIDTH = 220;
const NODE_ESTIMATED_HEIGHT = 140;

const nodeResizeBindings = new WeakMap<Element, NodeResizeBinding>();
let sharedNodeResizeObserver: ResizeObserver | undefined;
let nodeResizeFlushRaf: number | undefined;
const nodeResizePending = new Map<Element, DOMRectReadOnly>();

function scheduleNodeMinWidth(
	el: HTMLElement,
	setMinWidth: Solid.Setter<number | undefined>,
) {
	// Defer layout writes so ResizeObserver does not loop in the same frame.
	queueMicrotask(() => {
		if (!el.isConnected) return;
		const desired = Math.ceil(el.clientWidth / GRID_SIZE) * GRID_SIZE;
		setMinWidth((prev) => (prev === desired ? prev : desired));
	});
}

function getSharedNodeResizeObserver() {
	if (sharedNodeResizeObserver) return sharedNodeResizeObserver;
	sharedNodeResizeObserver = new ResizeObserver((entries) => {
		if (isPaneResizing()) return;
			for (const entry of entries) {
			nodeResizePending.set(entry.target, entry.contentRect);
		}
		if (nodeResizeFlushRaf !== undefined) return;
		nodeResizeFlushRaf = requestAnimationFrame(() => {
			nodeResizeFlushRaf = undefined;
			for (const [target, contentRect] of nodeResizePending) {
				nodeResizePending.delete(target);
				const binding = nodeResizeBindings.get(target);
				if (!binding) continue;
				binding.interfaceCtx.itemSizes.set(binding.node, {
					width: contentRect.width,
					height: contentRect.height,
				});
				binding.onMeasured?.(contentRect.width);
			}
		});
	});
	return sharedNodeResizeObserver;
}

interface Props {
	node: NodeModel;
	renderIndex: number;
	onSelected(ephemeral?: boolean): void;
}

const SchemaVariantColours: Record<NodeSchemaVariant, string> = {
	Exec: "bg-mg-exec",
	Base: "bg-mg-base",
	Event: "bg-mg-event",
	Pure: "bg-mg-pure",
	exec: "bg-mg-exec",
	base: "bg-mg-base",
	event: "bg-mg-event",
	pure: "bg-mg-pure",
};

const NodeContext = createContext<NodeModel>(null as any);

export const useNode = () => {
	const ctx = useContext(NodeContext);
	if (!ctx) throw new Error("NodeContext not found!");

	return ctx;
};

export const Node = (props: Props) => {
	const node = () => props.node;

	const platform = usePlatform();
	const graph = useGraphContext();
	const interfaceCtx = useInterfaceContext();

	const [active, setActive] = Solid.createSignal(0);
	const [running, setRunning] = Solid.createSignal(false);
	const [editingName, setEditingName] = Solid.createSignal(false);
	const [menuOpen, setMenuOpen] = Solid.createSignal(false);

	let ref: HTMLDivElement | undefined;

	Solid.onMount(() => {
		if (!ref) return;
		interfaceCtx.itemSizes.set(node(), {
			width: NODE_ESTIMATED_WIDTH,
			height: NODE_ESTIMATED_HEIGHT,
		});
	});

	Solid.createEffect(() => {
		if (!graph.loadComplete() || !ref) return;

		setRunning(NODE_RUNNING.isRunning(node()));
		const unsubEmit = NODE_EMIT.subscribe(node(), (data) => {
			if (node().id === data.id && data.schema === node().schema) {
				setActive(1);
				setTimeout(() => setActive(0), 200);
			}
		});
		const unsubRunning = NODE_RUNNING.subscribe(node(), () => {
			setRunning(NODE_RUNNING.isRunning(node()));
		});

		const obs = getSharedNodeResizeObserver();
		nodeResizeBindings.set(ref, {
			node: node(),
			interfaceCtx,
			onMeasured: () => scheduleNodeMinWidth(ref, setMinWidth),
		});
		obs.observe(ref);

		Solid.onCleanup(() => {
			unsubEmit();
			unsubRunning();
			obs.unobserve(ref);
			nodeResizeBindings.delete(ref);
		});
	});

	const isSelected = Solid.createMemo(() =>
		graph.selectedItemIds().some(
			(item) => item?.type === "node" && item.id === node().id,
		),
	);

	const connectionHighlight =
		config.nodes.indicateConnectedNodes === "off"
			? () => undefined
			: Solid.createMemo(() => {
					let result: string | undefined;
					const mode = config.nodes.indicateConnectedNodes;
					if (!mode || mode === "off" || isSelected()) return result;

					const selectedNodes = graph.selectedItemIds().filter(
						(item) => item.type === "node",
					);
					if (selectedNodes.length < 1) return result;
					if (selectedNodes.find((n) => n.id === node().id)) return result;

					let connectionSelected = false;

					if (!connectionSelected)
						exit: for (const output of node().state.outputs) {
							const outputConnections = graph
								.model()
								.connections.get(`${node().id}:o:${output.id}`);
							if (!outputConnections) continue;

							for (const outputConnection of outputConnections) {
								const { nodeId } = splitIORef(outputConnection);
								if (selectedNodes.find((n) => n.id === nodeId) !== undefined) {
									connectionSelected = true;
									break exit;
								}
							}
						}

					if (!connectionSelected)
						exit: for (const input of node().state.inputs) {
							const conns: OutputPin[] = [];

							if (input instanceof ExecInputModel) conns.push(...input.connections);
							else (input.connection as Option<any>).peek((i) => conns.push(i));

							for (const output of conns) {
								if (
									selectedNodes.find((n) => n.id === output.node.id) !== undefined
								) {
									connectionSelected = true;
									break exit;
								}
							}
						}

					if (mode === "highlightConnected") {
						if (connectionSelected && !isSelected()) result = "ring-2 ring-white";
					} else if (mode === "dimUnconnected") {
						if (!connectionSelected && !isSelected()) result = "opacity-50";
					}
					return result;
				});

	const filteredInputs = Solid.createMemo(() =>
		node().state.inputs.filter(
			(i) => !node().state.foldPins || hasConnection(i),
		),
	);
	const filteredOutputs = Solid.createMemo(() =>
		node().state.outputs.filter(
			(o) => !node().state.foldPins || hasConnection(o),
		),
	);

	const [minWidth, setMinWidth] = Solid.createSignal<number>();
	const pinsVisible = () => graph.pinsVisibleForIndex(props.renderIndex);

	Solid.createEffect(
		Solid.on(() => {
			if (!graph.loadComplete()) return;
			node().state.name;
			for (const i of node().state.inputs) {
				i.name ?? i.id;
			}
			for (const o of node().state.outputs) {
				o.name ?? o.id;
			}
		}, () => {
			if (ref) scheduleNodeMinWidth(ref, setMinWidth);
		}),
	);

	return (
		<NodeContext.Provider value={node()}>
			<div
				ref={ref}
				class={clsx(
					"absolute top-0 left-0 text-[12px] overflow-hidden rounded-lg flex flex-col bg-black/75 border-black/75 border-2",
					graph.webglGraph() && "webgl-graph-node",
					isSelected() && !graph.webglGraph() && "ring-2 ring-mg-focus opacity-100",
					isSelected() && graph.webglGraph() && "opacity-100",
					connectionHighlight(),
				)}
				style={{
					transform: `translate(${node().state.position.x}px, ${
						node().state.position.y
					}px)`,
					"min-width": minWidth() !== undefined ? `${minWidth()}px` : "auto",
				}}
				onMouseUp={(e) => {
					// #418
					if (
						interfaceCtx.state.status === "pinDragMode" &&
						interfaceCtx.state.state.status === "draggingPin" &&
						// #485
						!interfaceCtx.state.state.autoconnectIO
					) {
						interfaceCtx.setState({ status: "idle" });
					}
				}}
			>
				<div
					class={clsx(
						"h-6 duration-100 text-md font-medium flex flex-col items-stretch",
						active() === 1 && "opacity-50",
						running() && "node-running opacity-60",
						SchemaVariantColours[
							(() => {
								const schema = node().schema;
								return "variant" in schema
									? schema.variant
									: "type" in schema
										? schema.type
										: "Event";
							})()
						],
					)}
				>
					<Solid.Show
						when={editingName()}
						fallback={
							<Solid.Show
								when={graph.loadComplete()}
								fallback={
									<button
										type="button"
										class="px-2 pt-1 cursor-pointer outline-none h-full text-left w-full"
										onDblClick={(e) => !isCtrlEvent(e) && setEditingName(true)}
										onClick={(e) => e.stopPropagation()}
										onPointerUp={(e) => {
											if (e.button === 2) e.stopPropagation();
										}}
										onPointerDown={(e) =>
											handleSelectableItemPointerDown(e, graph, interfaceCtx, {
												type: "node",
												id: node().id,
											})
										}
									>
										<span class="flex min-w-0 items-center gap-1.5">
											<span class="truncate">{node().state.name}</span>
											<Solid.Show when={running()}>
												<span class="shrink-0 text-[10px] font-normal opacity-80">
													Running…
												</span>
											</Solid.Show>
										</span>
									</button>
								}
							>
							<ContextMenu.Root
								onOpenChange={(o) => {
									setMenuOpen(o);
									if (o) props.onSelected();
								}}
							>
								<ContextMenu.Trigger<"button">
									as="button"
									class="px-2 pt-1 cursor-pointer outline-none h-full text-left"
									onDblClick={(e) => !isCtrlEvent(e) && setEditingName(true)}
									onClick={(e) => e.stopPropagation()}
									// https://github.com/Brendonovich/MacroGraph/issues/452
									onPointerUp={(e) => {
										if (e.button === 2) e.stopPropagation();
									}}
									onPointerDown={(e) =>
										handleSelectableItemPointerDown(e, graph, interfaceCtx, {
											type: "node",
											id: node().id,
										})
									}
								>
									<span class="flex min-w-0 items-center gap-1.5">
										<span class="truncate">{node().state.name}</span>
										<Solid.Show when={running()}>
											<span class="shrink-0 text-[10px] font-normal opacity-80">
												Running…
											</span>
										</Solid.Show>
									</span>
								</ContextMenu.Trigger>
								<Solid.Show when={menuOpen()}>
									<ContextMenuContent>
										<ContextMenuItem onSelect={() => setEditingName(true)}>
											Rename
										</ContextMenuItem>
										{((node().schema.package.name === "Functions" &&
											node().schema.name === "Execute Function") ||
											(node().schema.package.name === "Function Queue" &&
												node().schema.name === "Add to Function Queue")) && (
											<ContextMenuItem
												onSelect={() => {
													const fnId = node().state.properties.function;
													if (fnId !== undefined) {
														const id =
															typeof fnId === "number" ? fnId : Number(fnId);
														const fn = node().graph.project.functions.get(id);
														if (fn) interfaceCtx.selectFunction(fn);
													}
												}}
											>
												Open Function
											</ContextMenuItem>
										)}
										<ContextMenuItem
											onSelect={() => {
												interfaceCtx.execute("setNodeTrackInvocations", {
													...graphRefOf(graph.model()),
													nodeId: node().id,
													trackInvocations: !node().state.trackInvocations,
												});
											}}
										>
											{node().state.trackInvocations
												? "Stop tracking invocations"
												: "Track invocations"}
										</ContextMenuItem>
										<ContextMenuItem
											onSelect={() => {
												interfaceCtx.execute("setNodeFoldPins", {
													...graphRefOf(graph.model()),
													nodeId: node().id,
													foldPins: !node().state.foldPins,
												});
											}}
											class="flex flex-row gap-4 items-center justify-between"
										>
											{node().state.foldPins ? "Expand" : "Collapse"}
										</ContextMenuItem>
										<ContextMenuItem
											onSelect={() => {
												platform.clipboard.writeText(
													serializeClipboardItem(nodeToClipboardItem(node())),
												);
												toast("Node copied to clipboard");
											}}
										>
											Copy
										</ContextMenuItem>
										<ContextMenuItem
											onSelect={() => {
												interfaceCtx.execute("deleteGraphItems", {
													...graphRefOf(graph.model()),
													items: [{ type: "node", id: node().id }],
												});
											}}
											class="text-red-500 flex flex-row gap-2 items-center justify-between"
										>
											Delete
										</ContextMenuItem>
									</ContextMenuContent>
								</Solid.Show>
							</ContextMenu.Root>
							</Solid.Show>
						}
					>
						{(_) => {
							const [value, setValue] = Solid.createSignal(node().state.name);

							let ref: HTMLInputElement | undefined;

							Solid.onMount(() => ref?.focus());

							return (
								<div class="px-2 pt-1">
									<input
										class="text-black p-0 pl-0.5 -mt-0.5 -ml-0.5 text-xs select-all outline-none"
										type="text"
										ref={ref}
										value={value()}
										onKeyPress={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												ref?.blur();
											}
										}}
										onInput={(e) => {
											setValue(
												e.target.value === ""
													? node().schema.name
													: e.target.value,
											);
										}}
										onBlur={() => {
											if (value() !== "")
												interfaceCtx.execute("setNodeName", {
													...graphRefOf(graph.model()),
													nodeId: node().id,
													name: value(),
												});

											setEditingName(false);
										}}
										onKeyDown={(e) => e.stopPropagation()}
										onContextMenu={(e) => e.stopPropagation()}
										onMouseDown={(e) => e.stopPropagation()}
									/>
								</div>
							);
						}}
					</Solid.Show>
				</div>
				<Solid.Show when={graph.shellMode()}>
					<div
						class="shrink-0 opacity-40"
						style={{
							width: `${NODE_ESTIMATED_WIDTH}px`,
							height: `${estimateNodeBodyHeight(node())}px`,
						}}
					/>
				</Solid.Show>
				<Solid.Show when={pinsVisible() && !graph.shellMode()}>
					<div class="flex flex-row gap-2">
						<div class="p-2 flex flex-col space-y-2.5">
							<Solid.For each={filteredInputs()}>
								{(input) => (
									<Solid.Switch>
										<Solid.Match when={input instanceof DataInputModel && input}>
											{(i) => <DataInput input={i()} />}
										</Solid.Match>
										<Solid.Match when={input instanceof ExecInputModel && input}>
											{(i) => <ExecInput input={i()} />}
										</Solid.Match>
										<Solid.Match when={input instanceof ScopeInputModel && input}>
											{(i) => <ScopeInput input={i()} />}
										</Solid.Match>
									</Solid.Switch>
								)}
							</Solid.For>
						</div>
						<div class="p-2 ml-auto flex flex-col space-y-2.5 items-end">
							<Solid.For each={filteredOutputs()}>
								{(output) => (
									<Solid.Switch>
										<Solid.Match
											when={output instanceof DataOutputModel && output}
										>
											{(o) => <DataOutput output={o()} />}
										</Solid.Match>
										<Solid.Match
											when={output instanceof ExecOutputModel && output}
										>
											{(o) => <ExecOutput output={o()} />}
										</Solid.Match>
										<Solid.Match
											when={output instanceof ScopeOutputModel && output}
										>
											{(o) => <ScopeOutput output={o()} />}
										</Solid.Match>
									</Solid.Switch>
								)}
							</Solid.For>
						</div>
					</div>
					<Solid.Show
						when={
							filteredInputs().length !== node().state.inputs.length ||
							filteredOutputs().length !== node().state.outputs.length
						}
					>
						<div class="text-center w-full h-4 flex flex-row items-center justify-center -mt-1">
							<button
								type="button"
								title="Expand node IO"
								class="hover:bg-white/30 transition-color duration-100 px-1 rounded -py-1 h-3 flex flex-row items-center justify-center"
								onClick={() => {
									interfaceCtx.execute("setNodeFoldPins", {
										...graphRefOf(graph.model()),
										nodeId: node().id,
										foldPins: false,
									});
								}}
							>
								<IconMdiDotsHorizontal class="size-4" />
							</button>
						</div>
					</Solid.Show>
				</Solid.Show>
			</div>
		</NodeContext.Provider>
	);
};
