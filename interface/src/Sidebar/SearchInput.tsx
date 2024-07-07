import type { ComponentProps } from "solid-js";

export function SearchInput(
	props: Omit<
		ComponentProps<"input">,
		"onKeyDown" | "type" | "class" | "placeholder"
	>,
) {
	return (
		<input
			onKeyDown={(e) => e.stopPropagation()}
			onKeyUp={(e) => e.stopPropagation()}
			type="text"
			class="h-6 w-full flex-1 bg-neutral-900 border-none rounded-sm text-xs !pl-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-500"
			placeholder="Search"
			{...props}
		/>
	);
}
