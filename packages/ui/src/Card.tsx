import { ComponentProps } from "solid-js";
import clsx from "clsx";
import { AsChildProp, Polymorphic } from "@kobalte/core";

export interface CardProps
	extends Omit<ComponentProps<"div">, "classList">,
		AsChildProp {}

export function Card(props: CardProps) {
	return (
		<Polymorphic
			as="div"
			{...props}
			class={clsx("border border-black bg-neutral-800 rounded ", props.class)}
		/>
	);
}
