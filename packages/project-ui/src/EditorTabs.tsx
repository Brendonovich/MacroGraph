import { cx } from "cva";
import {
	type Accessor,
	type ComponentProps,
	createMemo,
	For,
	type JSX,
	Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";

export type EditorTabsSchema<TSchema extends { type: string; tabId: number }> =
	{
		[K in TSchema["type"]]: {
			Component(state: Accessor<Extract<TSchema, { type: K }>>): JSX.Element;
			getMeta(state: Extract<TSchema, { type: K }>): {
				title: string;
				desc?: string;
			};
		};
	};

export type EditorTabsState<TSchema extends { type: string; tabId: number }> =
	Array<TSchema & { tabId: number }>;

export function makeEditorTabsBase<
	TSchema extends { type: string; tabId: number },
>(base: {
	schema: EditorTabsSchema<TSchema>;
	state: EditorTabsState<TSchema>;
}) {
	return base;
}

export function EditorTabs<TSchema extends { type: string; tabId: number }>(
	props: {
		schema: EditorTabsSchema<TSchema>;
		state: EditorTabsState<TSchema>;
		selectedTabId?: number | null;
		onChange?: (tabId: number) => void;
		onRemove?: (tabId: number) => void;
		onSplit?: () => void;
		onZoom?: () => void;
		focused?: boolean;
		zoomed?: boolean;
	} & Pick<ComponentProps<"div">, "ref">,
) {
	const selectedTabState = createMemo(() =>
		props.state.find((s) => s.tabId === props.selectedTabId),
	);

	const Component = createMemo(() => {
		const type = selectedTabState()?.type;
		if (type) return props.schema[type as keyof typeof props.schema].Component;
	});

	return (
		<div
			ref={props.ref}
			class="flex flex-col items-stretch flex-1 overflow-hidden"
		>
			<Show when={props.state.length > 0}>
				<div
					class="group/bar flex flex-row bg-gray-3"
					data-focused={props.focused}
				>
					<div class="overflow-x-auto scrollbar-none flex-1">
						<ul class="h-8 flex flex-row items-stretch divide-x divide-gray-5 scrollbar-none">
							<For each={props.state}>
								{(tab) => {
									const meta = () =>
										props.schema[tab.type as keyof typeof props.schema].getMeta(
											tab as any,
										);

									const selected = () => tab.tabId === props.selectedTabId;

									return (
										<li
											class={cx(
												"relative group/tab",
												selected() ? "text-gray-2" : "text-gray-3",
											)}
											data-selected={selected()}
										>
											<button
												type="button"
												class="h-full px-4 flex flex-row items-center bg-current group-data-[selected='true']/tab:border-transparent border-b border-gray-5 focus-visible:(ring-1 ring-inset ring-yellow outline-none) text-nowrap"
												onClick={() => props.onChange?.(tab.tabId)}
											>
												<span class="text-gray-12">{meta().title}</span>
												<Show when={meta().desc}>
													{(desc) => (
														<span class="ml-1 text-xs text-gray-11">
															{desc()}
														</span>
													)}
												</Show>
											</button>
											<div class="opacity-0 pointer-events-none group-hover/tab:opacity-100 focus-within:opacity-100 absolute top-0 bottom-px pl-2 pr-1 right-0 flex items-center justify-center bg-gradient-to-r from-transparent to-20% bg-gradient-to-current">
												<button
													type="button"
													class="bg-transparent pointer-events-auto text-white hover:bg-gray-6 p-0.5 rounded-sm focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
													onClick={() => props.onRemove?.(tab.tabId)}
												>
													<IconBiX class="size-3.5" />
												</button>
											</div>
										</li>
									);
								}}
							</For>
							<div class="flex-1 min-w-6 border-b border-gray-5" />
						</ul>
					</div>
					{props.focused && (
						<div class="h-full shrink-0 border-b border-l border-gray-5 flex flex-row items-center px-2 gap-1">
							<Show when={props.onSplit}>
								{(onSplit) => (
									<button
										type="button"
										title="Split this panel"
										onClick={() => onSplit()}
										disabled
										class="size-5 flex items-center justify-center bg-transparent opacity-0 group-hover/bar:opacity-100 group-data-[focused='true']/bar:opacity-100 text-gray-11 hover:(bg-gray-6 text-gray-12) rounded-sm focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
									>
										<IconPhSquareSplitHorizontal class="size-4" />
									</button>
								)}
							</Show>
							<Show when={props.onZoom}>
								{(onZoom) => (
									<button
										type="button"
										title="Zoom this panel"
										onClick={() => onZoom()()}
										class="size-5 flex items-center justify-center bg-transparent opacity-0 group-hover/bar:opacity-100 group-data-[focused='true']/bar:opacity-100 text-gray-11 hover:(bg-gray-6 text-gray-12) data-[zoomed='true']:(bg-gray-6 text-gray-12) rounded-sm focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
										data-zoomed={props.zoomed}
									>
										<Dynamic
											component={
												props.zoomed
													? IconTablerArrowsDiagonalMinimize2
													: IconTablerArrowsDiagonal
											}
											class="size-4"
										/>
									</button>
								)}
							</Show>
						</div>
					)}
				</div>
				<Show when={selectedTabState()}>
					{(selectedTabState) => (
						<div class="w-full h-full bg-gray-2 flex flex-col overflow-hidden">
							{Component()?.(selectedTabState as any)}
						</div>
					)}
				</Show>
			</Show>
		</div>
	);
}
