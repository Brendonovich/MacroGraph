import { Listbox } from "@kobalte/core/listbox";
import { Popover } from "@kobalte/core/popover";
import type { CreateQueryResult } from "@tanstack/solid-query";
import {
	Show,
	Suspense,
	createEffect,
	createMemo,
	createSignal,
	on,
	onMount,
} from "solid-js";

import { Input } from "./Input";

interface Props {
	value: string;
	onChange(v: string): void;
	class?: string;
	suggestionsQuery?: CreateQueryResult<string[] | undefined>;
}

export const TextInput = (props: Props) => {
	const [open, setOpen] = createSignal<"inputFocused" | "popoverFocused">();

	return (
		<Popover
			open={open() !== undefined}
			onOpenChange={(o) => {
				if (o) {
					props.suggestionsQuery?.refetch();
				} else setOpen();
			}}
			placement="bottom-start"
			gutter={4}
		>
			<Popover.Anchor>
				<Input
					type="text"
					value={props.value}
					onKeyDown={(e) => e.stopPropagation()}
					onInput={(e) => props.onChange(e.target.value)}
					onFocus={() => setTimeout(() => setOpen("inputFocused"), 1)}
					class={props.class}
				/>
			</Popover.Anchor>
			<Popover.Portal>
				<Show when={open()}>
					<Suspense>
						<Show when={props.suggestionsQuery?.data}>
							{(suggestions) => {
								const [mounted, setMounted] = createSignal(false);
								const [shouldFilter, setShouldFilter] = createSignal(false);

								onMount(() => {
									props.suggestionsQuery?.refetch();
									setMounted(true);
								});

								createEffect(
									on(
										() => props.value,
										() => {
											if (mounted()) setShouldFilter(true);
										},
										{ defer: true },
									),
								);

								const filteredOptions = createMemo(() => {
									if (shouldFilter())
										return (
											suggestions().filter((o) =>
												o.toLowerCase().includes(props.value.toLowerCase()),
											) ?? []
										);

									return suggestions();
								});

								return (
									<Show
										when={(() => {
											const f = filteredOptions();
											return f && f.length > 0;
										})()}
									>
										<Popover.Content
											class="w-52 max-h-48 overflow-y-auto ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 text-xs bg-neutral-700 rounded space-y-1 p-1"
											onOpenAutoFocus={(e) => e.preventDefault()}
											onInteractOutside={() => setOpen()}
										>
											<Listbox
												options={filteredOptions()}
												onChange={(options) => {
													const option = [...options][0];
													if (!option) return;

													props.onChange(option);
													setOpen();
												}}
												renderItem={(option) => (
													<Listbox.Item
														as="button"
														item={option}
														class="p-1 py-0.5 block w-full text-left focus-visible:outline-none hover:bg-blue-600 rounded-[0.125rem]"
													>
														<Listbox.ItemLabel>
															{option.rawValue}
														</Listbox.ItemLabel>
													</Listbox.Item>
												)}
											/>
										</Popover.Content>
									</Show>
								);
							}}
						</Show>
					</Suspense>
				</Show>
			</Popover.Portal>
		</Popover>
	);
};
