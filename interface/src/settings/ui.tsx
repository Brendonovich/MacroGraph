import { Dialog as KobalteDialog } from "@kobalte/core";
import {
	type ComponentProps,
	JSXElement,
	ParentProps,
	createSignal,
	splitProps,
} from "solid-js";

import clsx from "clsx";
import { useCoreContext } from "../contexts";

export const Button = (props: ComponentProps<"button">) => (
	<button
		{...props}
		class="bg-white disabled:bg-neutral-300 text-black py-1 px-4 rounded text-sm"
		type={props.type ?? "button"}
	>
		{props.children}
	</button>
);

export const Input = (props: ComponentProps<"input">) => (
	<input
		{...props}
		type={props.type ?? "text"}
		class="text-white bg-black placeholder:text-white/60 rounded border-neutral-500"
	/>
);
