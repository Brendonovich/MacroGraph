import { ContextMenu } from "@kobalte/core";
import {
	type CommentBox as CommentBoxModel,
	getNodesInRect,
} from "@macrograph/runtime";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import clsx from "clsx";
import { Show, createMemo, createRoot, createSignal, onMount } from "solid-js";
import {
	commentBoxToClipboardItem,
	serializeClipboardItem,
} from "@macrograph/clipboard";
import { toast } from "solid-sonner";

import type { SelectionItem } from "../../actions";
import { useInterfaceContext } from "../../context";
import { useGraphContext } from "./Context";
import { ContextMenuContent, ContextMenuItem } from "./ContextMenu";
import { handleSelectableItemPointerDown } from "./util";
import { usePlatform } from "../../platform";

interface Props {
	box: CommentBoxModel;
	onSelected(ephemeral?: boolean): void;
}

export function CommentBox(props: Props) {
	const platform = usePlatform();
	const interfaceCtx = useInterfaceContext();
	const graph = useGraphContext();

	const box = () => props.box;
	const position = () => props.box.position;
	const size = () => props.box.size;

	const [editing, setEditing] = createSignal(false);

	const isSelected = createMemo(() =>
		graph.state.selectedItemIds.some(
			(item) => item?.type === "commentBox" && item.id === box().id,
		),
	);

	function createResizerOnMouseDown(args: { x: "l" | "r"; y: "t" | "b" }) {
		return (e: MouseEvent) => {
			e.stopPropagation();

			if (e.button !== 0) return;

			const prevSelection = [...graph.state.selectedItemIds];

			props.onSelected(true);

			const size = { ...box().size };
			const position = { ...box().position };

			createRoot((dispose) => {
				createEventListenerMap(window, {
					mouseup: (e) => {
						dispose();

						const mousePosition = graph.toGraphSpace({
							x: e.clientX,
							y: e.clientY,
						});

						interfaceCtx.execute("setCommentBoxBounds", {
							graphId: graph.model().id,
							boxId: box().id,
							size: {
								x:
									size.x -
									(args.x === "l"
										? mousePosition.x - position.x
										: position.x + size.x - mousePosition.x),
								y:
									size.y -
									(args.y === "t"
										? mousePosition.y - position.y
										: position.y + size.y - mousePosition.y),
							},
							position: {
								x: args.x === "l" ? mousePosition.x : position.x,
								y: args.y === "t" ? mousePosition.y : position.y,
							},
							prev: { size, position, selection: prevSelection },
						});
					},
					mousemove: (e) => {
						const mousePosition = graph.toGraphSpace({
							x: e.clientX,
							y: e.clientY,
						});

						interfaceCtx.execute(
							"setCommentBoxBounds",
							{
								graphId: graph.model().id,
								boxId: box().id,
								size: {
									x:
										size.x -
										(args.x === "l"
											? mousePosition.x - position.x
											: position.x + size.x - mousePosition.x),
									y:
										size.y -
										(args.y === "t"
											? mousePosition.y - position.y
											: position.y + size.y - mousePosition.y),
								},
								position: {
									x: args.x === "l" ? mousePosition.x : position.x,
									y: args.y === "t" ? mousePosition.y : position.y,
								},
							},
							{ ephemeral: true },
						);
					},
				});
			});
		};
	}

	return (
		<div
			class={clsx(
				"rounded border-black/75 border absolute top-0 left-0",
				isSelected() && "ring-2 ring-mg-focus",
			)}
			style={{
				transform: `translate(${position().x}px, ${position().y}px)`,
				width: `${size().x}px`,
				height: `${size().y}px`,
				"background-color": `rgba(${hexToRgb(box().tint)}, 0.3)`,
			}}
		>
			<div class="truncate bg-white/50 text-black font-medium cursor-pointer outline-none rounded-t">
				<Show
					when={editing()}
					fallback={
						<ContextMenu.Root
							onOpenChange={(o) => {
								if (o) props.onSelected();
							}}
						>
							<ContextMenu.Trigger<"button">
								as="button"
								class="p-2 pl-3 outline-none w-full text-left"
								onClick={(e) => {
									e.stopPropagation();
								}}
								onPointerUp={(e) => {
									if (e.button === 2) e.stopPropagation();
								}}
								onPointerDown={(e) =>
									handleSelectableItemPointerDown(e, graph, interfaceCtx, {
										type: "commentBox",
										id: box().id,
									})
								}
								onDblClick={(e) => !e.shiftKey && setEditing(true)}
							>
								{props.box.text}
							</ContextMenu.Trigger>
							<ContextMenuContent>
								<ContextMenuItem onSelect={() => setEditing(true)}>
									Rename
								</ContextMenuItem>
								<ContextMenuItem
									onSelect={() => {
										platform.clipboard.writeText(
											serializeClipboardItem(
												commentBoxToClipboardItem(box(), (node) =>
													interfaceCtx.nodeSizes.get(node),
												),
											),
										);
										toast("Comment Box copied to clipboard");
									}}
								>
									Copy
								</ContextMenuItem>
								<ContextMenuItem
									onSelect={() => {
										interfaceCtx.execute("deleteGraphItems", {
											graphId: graph.model().id,
											items: [{ type: "commentBox", id: box().id }],
										});
									}}
									class="text-red-500 flex flex-row gap-2 items-center justify-between"
								>
									Delete
								</ContextMenuItem>
								<ContextMenuItem
									onSelect={() => {
										const items: Array<SelectionItem> = [
											{ type: "commentBox", id: box().id },
										];

										const nodes = getNodesInRect(
											graph.model().nodes.values(),
											new DOMRect(
												box().position.x,
												box().position.y,
												box().size.x,
												box().size.y,
											),
											(node) => interfaceCtx.itemSizes.get(node),
										);

										for (const node of nodes) {
											items.push({ type: "node", id: node.id });
										}

										interfaceCtx.execute("deleteGraphItems", {
											graphId: graph.model().id,
											items,
										});
									}}
									class="text-red-500 flex flex-row gap-2 items-center justify-between"
								>
									Delete with nodes
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu.Root>
					}
				>
					{(_) => {
						const [value, setValue] = createSignal(props.box.text);

						let ref: HTMLInputElement | undefined;

						onMount(() => ref?.focus());

						return (
							<div class="flex flex-row">
								<input
									ref={ref}
									class="m-2 p-0 pl-1 border-0 flex-1 rounded"
									type="text"
									value={value()}
									onInput={(e) => setValue(e.target.value)}
									onContextMenu={(e) => e.stopPropagation()}
									onMouseDown={(e) => e.stopPropagation()}
									onBlur={() => {
										if (value() !== "") {
											interfaceCtx.execute("setCommentBoxText", {
												graphId: graph.model().id,
												boxId: box().id,
												text: value(),
											});
										}

										setEditing(false);
									}}
									onKeyDown={(e) => {
										e.stopPropagation();
										if (e.key === "Enter") {
											e.preventDefault();
											ref?.blur();
										}
									}}
								/>
							</div>
						);
					}}
				</Show>
			</div>
			<div
				class="bg-transparent w-2 h-2 cursor-nwse-resize -right-1 -bottom-1 fixed"
				onMouseDown={createResizerOnMouseDown({ x: "r", y: "b" })}
			/>
			<div
				class="bg-transparent w-2 h-2 cursor-nesw-resize -left-1 -bottom-1 fixed"
				onMouseDown={createResizerOnMouseDown({ x: "l", y: "b" })}
			/>
			<div
				class="bg-transparent w-2 h-2 cursor-nesw-resize -right-1 -top-1 fixed"
				onMouseDown={createResizerOnMouseDown({ x: "r", y: "t" })}
			/>
			<div
				class="bg-transparent w-2 h-2 cursor-nwse-resize -left-1 -top-1 fixed"
				onMouseDown={createResizerOnMouseDown({ x: "l", y: "t" })}
			/>
		</div>
	);
}

function hexToRgb(hex: string) {
	// Remove the hash at the start if it's there
	hex = hex.replace(/^#/, "");
	if (hex.length === 3) {
		hex = hex
			.split("")
			.map((hex: string) => hex + hex)
			.join("");
	}

	// Parse the r, g, b values
	const bigint = parseInt(hex, 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;

	return `${r}, ${g}, ${b}`;
}
