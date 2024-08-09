import { ContextMenu } from "@kobalte/core";
import {
	DataInput as DataInputModel,
	DataOutput as DataOutputModel,
	ExecInput as ExecInputModel,
	ExecOutput as ExecOutputModel,
	NODE_EMIT,
	type Node as NodeModel,
	type NodeSchemaVariant,
	ScopeInput as ScopeInputModel,
	ScopeOutput as ScopeOutputModel,
	type XY,
	hasConnection,
} from "@macrograph/runtime";
import clsx from "clsx";
import * as Solid from "solid-js";
import { createContext, useContext } from "solid-js";

import { useInterfaceContext } from "../../context";
import { isCtrlEvent } from "../../util";
import { useGraphContext } from "./Context";
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
import { handleSelectableItemMouseDown } from "./util";

interface Props {
	node: NodeModel;
	onSelected(): void;
	onDrag(delta: XY): void;
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

	const graph = useGraphContext();
	const interfaceCtx = useInterfaceContext();

	const ACTIVE = NODE_EMIT.subscribe(node(), (data) => {
		if (node().id === data.id && data.schema === node().schema) {
			updateActive(1);
			setTimeout(() => {
				updateActive(0);
			}, 200);
		}
	});

	const [active, updateActive] = Solid.createSignal(0);

	Solid.onCleanup(ACTIVE);

	const [editingName, setEditingName] = Solid.createSignal(false);

	let ref: HTMLDivElement | undefined;

	Solid.onMount(() => {
		if (!ref) return;

		const rect = ref.getBoundingClientRect();

		interfaceCtx.nodeSizes.set(node(), {
			width: rect.width,
			height: rect.height,
		});

		const obs = new ResizeObserver((resize) => {
			const contentRect = resize[resize.length - 1]?.contentRect;

			if (!contentRect) return;

			interfaceCtx.nodeSizes.set(node(), {
				width: contentRect.width,
				height: contentRect.height,
			});
		});

		obs.observe(ref);

		Solid.onCleanup(() => {
			obs.disconnect();
			interfaceCtx.nodeSizes.delete(node());
		});
	});

	const isSelected = Solid.createMemo(() =>
		graph.state.selectedItemIds.some(
			(item) => item?.type === "node" && item.id === node().id,
		),
	);

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

	return (
		<NodeContext.Provider value={node()}>
			<div
				ref={ref}
				class={clsx(
					"absolute top-0 left-0 text-[12px] overflow-hidden rounded-lg flex flex-col bg-black/75 border-black/75 border-2",
					isSelected() && "ring-2 ring-mg-focus",
				)}
				style={{
					transform: `translate(${node().state.position.x}px, ${
						node().state.position.y
					}px)`,
				}}
				onMouseUp={(e) => {
					// #418
					if (
						interfaceCtx.state.status === "pinDragMode" &&
						interfaceCtx.state.state.status === "draggingPin"
					) {
						interfaceCtx.setState({ status: "idle" });
					}
				}}
			>
				<div
					class={clsx(
						"h-6 duration-100 text-md font-medium",
						active() === 1 && "opacity-50",
						(() => {
							const schema = node().schema;
							return SchemaVariantColours[
								"variant" in schema
									? schema.variant
									: "type" in schema
										? schema.type
										: "Event"
							];
						})(),
					)}
				>
					<Solid.Show
						when={editingName()}
						fallback={
							<ContextMenu.Root
								onOpenChange={(o) => {
									if (o) props.onSelected();
								}}
							>
								<ContextMenu.Trigger<"button">
									as="button"
									class="px-2 pt-1 cursor-pointer outline-none w-full h-full text-left"
									onDblClick={(e) => !isCtrlEvent(e) && setEditingName(true)}
									onClick={(e) => {
										e.stopPropagation();
										e.preventDefault();
									}}
									onMouseDown={(e) =>
										handleSelectableItemMouseDown(
											e,
											graph,
											interfaceCtx,
											props.onSelected,
											{ type: "node", id: node().id },
										)
									}
								>
									{node().state.name}
								</ContextMenu.Trigger>
								<ContextMenuContent>
									<ContextMenuItem onSelect={() => setEditingName(true)}>
										Rename
									</ContextMenuItem>
									<ContextMenuItem
										onSelect={() => {
											interfaceCtx.execute("setNodeFoldPins", {
												graphId: graph.model().id,
												nodeId: node().id,
												foldPins: !node().state.foldPins,
											});
										}}
										class="flex flex-row gap-4 items-center justify-between"
									>
										{node().state.foldPins ? "Expand" : "Collapse"}
										{/* <span class="flex flex-row gap-0.5 text-xs text-neutral-300 font-sans items-base">
												<kbd class="font-sans">⌘</kbd>
												<kbd class="font-sans">Ctrl</kbd>
												{node().state.foldPins ? (
													<kbd class="font-sans">]</kbd>
												) : (
													<kbd class="font-sans">]</kbd>
												)}
											</span> */}
									</ContextMenuItem>
									<ContextMenuItem
										onSelect={() => {
											interfaceCtx.execute("deleteGraphItems", {
												graphId: graph.model().id,
												items: [{ type: "node", id: node().id }],
											});
										}}
										class="text-red-500 flex flex-row gap-2 items-center justify-between"
									>
										Delete
										{/* <span class="flex flex-row gap-0.5 text-xs text-neutral-300">
												<kbd class="font-sans">⌫</kbd>
											</span> */}
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu.Root>
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
													graphId: graph.model().id,
													nodeId: node().id,
													name: value(),
												});

											setEditingName(false);
										}}
										onContextMenu={(e) => e.stopPropagation()}
										onMouseDown={(e) => e.stopPropagation()}
									/>
								</div>
							);
						}}
					</Solid.Show>
				</div>
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
									graphId: graph.model().id,
									nodeId: node().id,
									foldPins: false,
								});
							}}
						>
							<IconMdiDotsHorizontal class="size-4" />
						</button>
					</div>
				</Solid.Show>
			</div>
		</NodeContext.Provider>
	);
};
