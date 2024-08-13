import { createEffect, createSignal } from "solid-js";
import { Input } from "./Input";

interface Props {
	initialValue: number;
	onChange(v: number): void;
	class?: string;
	value?: number;
}

export const FloatInput = (props: Props) => {
	// if NaN reset to 0
	// const initialValue = Number.isNaN(props.initialValue)
	//   ? 0
	//   : props.initialValue;

	const [value, setValue] = createSignal(props.initialValue.toString());
	createEffect(() => {
		if (props.value !== undefined) setValue(props.value.toString());
	});

	return (
		<Input
			type="text"
			value={value()}
			onKeyDown={(e) => e.stopPropagation()}
			onKeyUp={(e) => e.stopPropagation()}
			onChange={(e) => {
				e.stopPropagation();

				const value = e.target.value;
				setValue(value);

				const numValue = Number.parseFloat(value);
				if (!Number.isNaN(numValue)) props.onChange(numValue);
			}}
			onBlur={(e) => {
				const s = e.target.value;
				const num = Number.parseFloat(s);

				if (s.length === 0) {
					setValue("0");
					props.onChange(0);
				} else if (Number.isNaN(num)) {
					setValue(props.initialValue.toString());
				} else {
					setValue(num.toString());
					props.onChange(num);
				}
			}}
			class={props.class}
		/>
	);
};
