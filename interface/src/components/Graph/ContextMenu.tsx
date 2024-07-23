import { ContextMenu } from "@kobalte/core";
import type { ParentProps } from "solid-js";
import { tw } from "../../util";

export const ContextMenuItem = tw(
	ContextMenu.Item,
)`px-1.5 py-1 outline-none ui-highlighted:bg-white/10 rounded-sm`;

export function ContextMenuContent(props: ParentProps) {
	return (
		<ContextMenu.Portal>
			<ContextMenu.Content class="border border-black rounded bg-neutral-900 min-w-28 text-sm ui-expanded:animate-in ui-expanded:fade-in ui-expanded:zoom-in-95 origin-top-left ui-closed:animate-out ui-closed:fade-out ui-closed:zoom-out-95 p-1 focus:outline-none select-none">
				{props.children}
			</ContextMenu.Content>
		</ContextMenu.Portal>
	);
}
