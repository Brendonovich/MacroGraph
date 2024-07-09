import { Popover } from "@kobalte/core";
import clsx from "clsx";
import { For, type ResourceReturn, createMemo, on, onMount } from "solid-js";
import {
	Show,
	Suspense,
	createEffect,
	createResource,
	createSignal,
} from "solid-js";

interface Props {
	value: string;
	onChange(v: string): void;
	class?: string;
	fetchSuggestions?(): Promise<string[]>;
}

export const TextInput = (props: Props) => {
	const [open, setOpen] = createSignal<"inputFocused" | "popoverFocused">();

	const resource = createMemo<ResourceReturn<string[]> | undefined>((prev) => {
		if (prev) return prev;

		if (open() !== undefined)
			return createResource(
				() => props.fetchSuggestions?.(),
				() => props.fetchSuggestions?.() ?? [],
			);
	});

	createEffect(() => console.log(open()));

	return (
		<Popover.Root
			open={open() !== undefined}
			placement="bottom-start"
			gutter={4}
		>
			<Popover.Anchor>
				<input
					value={props.value}
					onInput={(e) => props.onChange(e.target.value)}
					onFocus={() => setTimeout(() => setOpen("inputFocused"), 1)}
					onBlur={() => setTimeout(() => setOpen())}
					onMouseDown={() => setOpen("inputFocused")}
					class={clsx(
						"h-6 w-full flex-1 bg-neutral-900 border-neutral-700 rounded-sm text-xs pl-1.5 appearance-none focus:ring-0 focus:border-yellow-500",
						props.class,
					)}
				/>
			</Popover.Anchor>
			<Popover.Portal>
				<Show when={open()}>
					<Suspense>
						<Show when={resource()} keyed>
							{([options, { refetch }]) => {
								const [mounted, setMounted] = createSignal(false);
								const [shouldFilter, setShouldFilter] = createSignal(false);

								onMount(() => {
									refetch();
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
											options.latest?.filter((o) =>
												o.toLowerCase().includes(props.value.toLowerCase()),
											) ?? []
										);

									return options.latest;
								});

								return (
									<Show
										when={(() => {
											const f = filteredOptions();
											return f && f.length > 0;
										})()}
									>
										<Popover.Content
											as="ul"
											class="w-52 max-h-48 bg-black text-white overflow-y-auto text-sm rounded overflow-x-hidden border border-neutral-700"
											onOpenAutoFocus={(e) => e.preventDefault()}
											onInteractOutside={() => setOpen()}
										>
											<For each={filteredOptions()}>
												{(option) => (
													<li
														onClick={() => {
															props.onChange(option);
															setOpen();
														}}
														onKeyPress={(e) => {
															if (e.key === "Enter") e.currentTarget.click();
														}}
														class="w-full px-2 py-1 hover:bg-white/20"
													>
														{option}
													</li>
												)}
											</For>
										</Popover.Content>
									</Show>
								);
							}}
						</Show>
					</Suspense>
				</Show>
			</Popover.Portal>
		</Popover.Root>
	);
};
