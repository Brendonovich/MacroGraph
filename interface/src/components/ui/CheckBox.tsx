import clsx from "clsx";

interface Props {
	value: boolean;
	onChange(value: boolean): void;
	class?: string;
}

export const CheckBox = (props: Props) => {
	return (
		<div
			role="checkbox"
			aria-checked={props.value}
			onPointerDown={(e) => {
				e.stopPropagation();
			}}
			onClick={() => props.onChange(!props.value)}
			class={clsx(
				"w-4 h-4 cursor-pointer relative inline-flex items-center justify-center rounded border",
				"focus-visible:ring-2 ring-mg-focus",
				props.value
					? "bg-[#0075FF] border-[#0075FF]"
					: "bg-white border-white",
				props.class,
			)}
		>
			<svg
				viewBox="0 0 13 10"
				fill="transparent"
				aria-hidden="true"
				class="absolute w-3 h-3"
				style={{ top: "2px", left: "2px", pointerEvents: "none" }}
			>
				<path d="M1.5 5.5L4.5 8.5L10.5 1.5" stroke="white" stroke-width="2" />
			</svg>
		</div>
	);
};
