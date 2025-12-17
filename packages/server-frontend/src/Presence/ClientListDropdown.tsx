import { Popover } from "@kobalte/core/popover";
import { focusRingClasses } from "@macrograph/ui";
import { cx } from "cva";
import { createMemo, For, Show } from "solid-js";

import IconLucideChevronDown from "~icons/lucide/chevron-down";
import { Avatar } from "../Avatar";
import { useRealtimeContext } from "../Realtime";
import { usePresenceContext } from "./Context";

export function ClientListDropdown() {
	const presenceCtx = usePresenceContext();
	const realtimeCtx = useRealtimeContext();

	const clientEntries = createMemo(() => Object.entries(presenceCtx.clients));
	const realtimeId = () => realtimeCtx.id().toString();

	return (
		<Popover
			placement="bottom-start"
			sameWidth
			gutter={4}
			open={clientEntries().length <= 1 ? false : undefined}
		>
			<Show when={clientEntries().find(([id]) => id === realtimeId())}>
				{(data) => (
					<Popover.Trigger
						disabled={clientEntries().length <= 1}
						class={cx(
							"h-full bg-transparent px-2 not-disabled:@hover-bg-gray-3 not-disabled:active:bg-gray-3 group flex flex-row items-center space-x-1",
							focusRingClasses("inset"),
						)}
					>
						<div class="flex flex-row space-x-1.5 items-center">
							<Avatar
								name={data()[1].name}
								style={{ "background-color": data()[1].colour }}
							/>
							<span>{data()[1].name}</span>
						</div>
						{clientEntries().length > 1 && (
							<IconLucideChevronDown class="ui-expanded:rotate-180 transition-transform" />
						)}
					</Popover.Trigger>
				)}
			</Show>
			<Popover.Portal>
				<Popover.Content
					as="ul"
					class="outline-none flex flex-col bg-gray-1 p-1.5 pt-1 rounded text-sm ui-expanded:(animate-in slide-in-from-top-1 fade-in) ui-closed:(animate-out slide-out-to-top-1 fade-out)"
				>
					<span class="text-xs text-gray-10 mb-1.5">Connected Clients</span>
					<ul class="space-y-1.5">
						<For each={clientEntries()}>
							{([id, data]) => (
								<Show when={id !== realtimeId()}>
									<li>
										<div class="flex flex-row space-x-1.5 items-center">
											<Avatar
												name={data.name}
												style={{
													"background-color": data.colour,
												}}
											/>
											<span>{data.name}</span>
										</div>
									</li>
								</Show>
							)}
						</For>
					</ul>
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	);
}
