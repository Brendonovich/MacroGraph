import { cx } from "cva";
import { ComponentProps } from "solid-js";

export function Avatar(props: { name: string } & ComponentProps<"div">) {
	return (
		<div
			{...props}
			class={cx(
				"rounded-full size-5.5 flex items-center justify-center text-[0.65rem]",
				props.class,
			)}
		>
			<span>
				{props.name
					?.split(" ")
					.slice(0, 2)
					.map((s) => s[0]?.toUpperCase())}
			</span>
		</div>
	);
}
