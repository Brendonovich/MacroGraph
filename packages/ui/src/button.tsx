import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { Component, ComponentProps } from "solid-js";
import { createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

import { cn } from "./lib/utils";

const buttonVariants = cva(
	"ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border-input hover:bg-accent hover:text-accent-foreground border",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				md: "h-10 px-4 py-2",
				sm: "h-8 rounded-md px-3",
				lg: "h-11 rounded-md px-4",
				icon: "p-1",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "sm",
		},
	},
);

export interface ButtonProps
	extends ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {}

const Button: Component<ButtonProps> = (props) => {
	const [, rest] = splitProps(props, ["variant", "size", "class"]);
	return (
		<button
			class={cn(
				buttonVariants({ variant: props.variant, size: props.size }),
				props.class,
			)}
			{...rest}
		/>
	);
};

export function AsyncButton(
	props: Omit<ButtonProps, "onClick"> & {
		onClick?: (
			...p: Parameters<JSX.EventHandler<HTMLButtonElement, MouseEvent>>
		) => any | Promise<any>;
		loadingChildren?: JSX.Element;
	},
) {
	const [loading, setLoading] = createSignal(false);

	return (
		<Button
			{...props}
			class={cn(props.class, "transition-color")}
			disabled={loading() || props.disabled}
			onClick={(e) => {
				const p = props.onClick?.(e);
				if (!(p instanceof Promise)) return;
				setLoading(true);
				p.finally(() => setLoading(false));
			}}
		>
			{loading() ? (props.loadingChildren ?? props.children) : props.children}
		</Button>
	);
}

export { Button, buttonVariants };
