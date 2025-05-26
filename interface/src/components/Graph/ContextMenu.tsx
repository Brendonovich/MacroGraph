import { ContextMenu } from "@kobalte/core";
import type { ComponentProps } from "solid-js";
import clsx from "clsx";

import { tw } from "../../util";
import { useInlineTextEditorCtx } from "../../Sidebar/InlineTextEditor";

export const ContextMenuItem = tw(
	ContextMenu.Item,
)`px-1.5 py-1.5 outline-none ui-highlighted:bg-white/10 rounded-sm flex flex-row items-center gap-2`;

export function ContextMenuRenameItem() {
	const inlineEditorContext = useInlineTextEditorCtx()!;

	return (
		<ContextMenuItem
			onSelect={() => {
				inlineEditorContext.setEditing(true);
			}}
		>
			<IconAntDesignEditOutlined /> Rename
		</ContextMenuItem>
	);
}

export function ContextMenuContent(
	props: Omit<ComponentProps<typeof ContextMenu.Content<"div">>, "onKeyDown">,
) {
	return (
		<ContextMenu.Portal>
			<ContextMenu.Content
				{...props}
				onKeyDown={(e) => e.stopPropagation()}
				class={clsx(
					"border border-black rounded bg-neutral-900 min-w-32 text-sm ui-expanded:animate-in ui-expanded:fade-in ui-expanded:zoom-in-95 origin-top-left ui-closed:animate-out ui-closed:fade-out ui-closed:zoom-out-95 p-1 focus:outline-none select-none text-neutral-300",
					props.class,
				)}
			>
				{props.children}
			</ContextMenu.Content>
		</ContextMenu.Portal>
	);
}
