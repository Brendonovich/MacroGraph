import type { ComponentProps } from "solid-js";

export function Header(props: Omit<ComponentProps<"div">, "class">) {
	return (
		<div {...props} class="flex flex-row items-center h-9 z-10 shrink-0" />
	);
}
