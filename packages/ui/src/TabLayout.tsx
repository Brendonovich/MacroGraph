import { DropdownMenu } from "@kobalte/core/dropdown-menu";
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

import { isTouchDevice } from "./platform";

export namespace TabLayout {
	export type Schema<TTab> = {
		Component(state: Accessor<TTab>): JSX.Element;
		getMeta(state: TTab): {
			title: string;
			desc?: string;
		};
	};

	export type TabState<TType extends string = string> = {
		type: TType;
		tabId: number;
	};

	export type State<TTab extends TabState> = {
		selectedTab: number | null;
		tabs: Array<TTab>;
	};

	export function defineController<TSchema extends TabState>(
		base: Controller<TSchema>,
	) {
		return base;
	}

	export type Schemas<TTab extends TabState> = {
		[K in TTab["type"]]: Schema<Extract<TTab, { type: K }>>;
	};

	export type Controller<TTab extends TabState> = {
		schema: Schemas<TTab>;
	} & State<TTab>;

	export function removeTab<TTab extends TabState>(
		state: State<TTab>,
		id: number,
	) {
		const selectedIndex = state.tabs.findIndex(
			(t) => t.tabId === state.selectedTab,
		);
		if (selectedIndex === -1) return;

		state.tabs = state.tabs.filter((t) => t.tabId !== id);
		if (id === state.selectedTab) {
			const nextId = state.tabs[selectedIndex]?.tabId ?? state.tabs[0]?.tabId;
			if (nextId !== undefined) state.selectedTab = nextId;
		}
	}
}

export function TabLayoutView<TSchema extends TabLayout.TabState>(
	props: TabLayout.Controller<TSchema> & {
		selectedTabId?: number | null;
		onSelectedChange?: (tabId: number) => void;
		onRemove?: (tabId: number) => void;
		focused?: boolean;
		focusActions?: JSX.Element;
	} & Pick<ComponentProps<"div">, "ref">,
) {
	const selectedTabState = createMemo(() =>
		props.tabs.find((s) => s.tabId === props.selectedTabId),
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
			<Show when={props.tabs.length > 0}>
				<div
					class="group/bar flex flex-row bg-gray-3"
					data-focused={props.focused}
				>
					<div class="overflow-x-auto scrollbar-none flex-1">
						<ul class="h-8 flex flex-row items-stretch divide-x divide-gray-5 scrollbar-none">
							<For each={props.tabs}>
								{(tab) => {
									const meta = () =>
										props.schema[tab.type as keyof typeof props.schema].getMeta(
											tab as any,
										);

									const selected = () => tab.tabId === props.selectedTabId;

									return (
										<li
											class={cx(
												"relative group/tab flex flex-row bg-current border-b",
												selected()
													? "text-gray-2 !border-b-transparent"
													: "text-gray-3 !border-b-gray-5",
												isTouchDevice ? "pl-3 pr-1 gap-1.5" : "px-4",
											)}
											data-selected={selected()}
										>
											<button
												type="button"
												class={cx(
													"h-full flex flex-row items-center focus-visible:(ring-1 ring-inset ring-yellow outline-none) text-nowrap",
												)}
												onClick={() => props.onSelectedChange?.(tab.tabId)}
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
											<div
												class={cx(
													"pointer-events-none focus-within:opacity-100 pr-1 flex items-center justify-center bg-gradient-to-r from-transparent to-20% bg-gradient-to-current",
													!isTouchDevice &&
														"opacity-0 group-hover/tab:opacity-100 absolute top-0 right-0 bottom-px pl-2",
												)}
											>
												<button
													type="button"
													class={cx(
														"pointer-events-auto text-white hover:bg-gray-6 p-0.5 rounded-sm focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)",
														!isTouchDevice && "bg-transparent",
													)}
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
					<Show when={props.focused}>{props.focusActions}</Show>
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

export function TabLayoutActions(props: {
	onSplit?: (direction: "horizontal" | "vertical") => void;
	onZoom?: () => void;
	zoomed?: boolean;
}) {
	return (
		<div class="h-full shrink-0 border-b border-l border-gray-5 flex flex-row items-center px-2 gap-1">
			<Show when={props.onSplit}>
				{(onSplit) => (
					<DropdownMenu placement="bottom-end">
						<DropdownMenu.Trigger
							title="Split Pane"
							class="size-5 flex items-center justify-center bg-transparent opacity-0 group-hover/bar:opacity-100 group-data-[focused='true']/bar:opacity-100 text-gray-11 hover:(bg-gray-6 text-gray-12) rounded-sm focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
						>
							<IconPhSquareSplitHorizontal class="size-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="p-1 bg-gray-3 z-10 text-xs border border-gray-5 animate-in fade-in slide-in-from-top-1">
							<DropdownMenu.Item
								class="py-0.5 px-1 @hover-bg-gray-5 rounded"
								onSelect={() => onSplit()("horizontal")}
							>
								Split Right
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="py-0.5 px-1 @hover-bg-gray-5 rounded"
								onSelect={() => onSplit()("vertical")}
							>
								Split Down
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu>
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
	);
}
