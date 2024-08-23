import * as DropdownMenuPrimitive from "@kobalte/core/dropdown-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "./lib/utils";

const DropdownMenu: Component<DropdownMenuPrimitive.DropdownMenuRootProps> = (
	props,
) => {
	return <DropdownMenuPrimitive.Root gutter={4} {...props} />;
};

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

type DropdownMenuContentProps<T extends ValidComponent = "div"> =
	DropdownMenuPrimitive.DropdownMenuContentProps<T> & {
		class?: string | undefined;
	};

const DropdownMenuContent = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DropdownMenuContentProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuContentProps, ["class"]);
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				class={cn(
					"bg-popover text-popover-foreground animate-content-hide data-[expanded]:animate-content-show z-50 min-w-[8rem] origin-[var(--kb-menu-content-transform-origin)] overflow-hidden rounded-md border border-border p-1 shadow-md",
					props.class,
				)}
				{...rest}
			/>
		</DropdownMenuPrimitive.Portal>
	);
};

type DropdownMenuItemProps<T extends ValidComponent = "div"> =
	DropdownMenuPrimitive.DropdownMenuItemProps<T> & {
		class?: string | undefined;
	};

const DropdownMenuItem = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DropdownMenuItemProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuItemProps, ["class"]);
	return (
		<DropdownMenuPrimitive.Item
			class={cn(
				"ui-highlighted:bg-accent ui-highlighted:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				props.class,
			)}
			{...rest}
		/>
	);
};

const DropdownMenuShortcut: Component<ComponentProps<"span">> = (props) => {
	const [, rest] = splitProps(props, ["class"]);
	return (
		<span
			class={cn("ml-auto text-xs tracking-widest opacity-60", props.class)}
			{...rest}
		/>
	);
};

const DropdownMenuLabel: Component<
	ComponentProps<"div"> & { inset?: boolean }
> = (props) => {
	const [, rest] = splitProps(props, ["class", "inset"]);
	return (
		<div
			class={cn(
				"px-2 py-1.5 text-sm font-semibold",
				props.inset && "pl-8",
				props.class,
			)}
			{...rest}
		/>
	);
};

type DropdownMenuSeparatorProps<T extends ValidComponent = "hr"> =
	DropdownMenuPrimitive.DropdownMenuSeparatorProps<T> & {
		class?: string | undefined;
	};

const DropdownMenuSeparator = <T extends ValidComponent = "hr">(
	props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuSeparatorProps, ["class"]);
	return (
		<DropdownMenuPrimitive.Separator
			class={cn("bg-muted -mx-1 my-1 h-px", props.class)}
			{...rest}
		/>
	);
};

type DropdownMenuSubTriggerProps<T extends ValidComponent = "div"> =
	DropdownMenuPrimitive.DropdownMenuSubTriggerProps<T> & {
		class?: string | undefined;
		children?: JSX.Element;
	};

const DropdownMenuSubTrigger = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DropdownMenuSubTriggerProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuSubTriggerProps, [
		"class",
		"children",
	]);
	return (
		<DropdownMenuPrimitive.SubTrigger
			class={cn(
				"focus:bg-accent data-[state=open]:bg-accent flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
				props.class,
			)}
			{...rest}
		>
			{props.children}
			<IconTablerChevronRight class="ml-auto h-4 w-4" />
		</DropdownMenuPrimitive.SubTrigger>
	);
};

type DropdownMenuSubContentProps<T extends ValidComponent = "div"> =
	DropdownMenuPrimitive.DropdownMenuSubContentProps<T> & {
		class?: string | undefined;
	};

const DropdownMenuSubContent = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuSubContentProps, ["class"]);
	return (
		<DropdownMenuPrimitive.SubContent
			class={cn(
				"bg-popover text-popover-foreground animate-in z-50 min-w-[8rem] origin-[var(--kb-menu-content-transform-origin)] overflow-hidden rounded-md border p-1 shadow-md",
				props.class,
			)}
			{...rest}
		/>
	);
};

type DropdownMenuCheckboxItemProps<T extends ValidComponent = "div"> =
	DropdownMenuPrimitive.DropdownMenuCheckboxItemProps<T> & {
		class?: string | undefined;
		children?: JSX.Element;
	};

const DropdownMenuCheckboxItem = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DropdownMenuCheckboxItemProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuCheckboxItemProps, [
		"class",
		"children",
	]);
	return (
		<DropdownMenuPrimitive.CheckboxItem
			class={cn(
				"focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				props.class,
			)}
			{...rest}
		>
			<span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
				<DropdownMenuPrimitive.ItemIndicator>
					<IconTablerCheck class="h-4 w-4" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{props.children}
		</DropdownMenuPrimitive.CheckboxItem>
	);
};

type DropdownMenuGroupLabelProps<T extends ValidComponent = "span"> =
	DropdownMenuPrimitive.DropdownMenuGroupLabelProps<T> & {
		class?: string | undefined;
	};

const DropdownMenuGroupLabel = <T extends ValidComponent = "span">(
	props: PolymorphicProps<T, DropdownMenuGroupLabelProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuGroupLabelProps, ["class"]);
	return (
		<DropdownMenuPrimitive.GroupLabel
			class={cn("px-2 py-1.5 text-sm font-semibold", props.class)}
			{...rest}
		/>
	);
};

type DropdownMenuRadioItemProps<T extends ValidComponent = "div"> =
	DropdownMenuPrimitive.DropdownMenuRadioItemProps<T> & {
		class?: string | undefined;
		children?: JSX.Element;
	};

const DropdownMenuRadioItem = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DropdownMenuRadioItemProps<T>>,
) => {
	const [, rest] = splitProps(props as DropdownMenuRadioItemProps, [
		"class",
		"children",
	]);
	return (
		<DropdownMenuPrimitive.RadioItem
			class={cn(
				"focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				props.class,
			)}
			{...rest}
		>
			<span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
				<DropdownMenuPrimitive.ItemIndicator>
					<IconTablerCircle class="h-2 w-2 fill-current" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{props.children}
		</DropdownMenuPrimitive.RadioItem>
	);
};

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuCheckboxItem,
	DropdownMenuGroup,
	DropdownMenuGroupLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
};
