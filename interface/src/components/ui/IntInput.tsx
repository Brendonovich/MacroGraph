import { NumberField } from "@kobalte/core/number-field";
import { createEventListener } from "@solid-primitives/event-listener";
import clsx from "clsx";
import { batch, createEffect, createSignal, onMount } from "solid-js";

import { Input } from "./Input";

interface Props {
	initialValue: number;
	value?: number;
	onChange(v: number): void;
	class?: string;
}

export const IntInput = (props: Props) => {
	// if NaN reset to 0
	const initialValue = Number.isNaN(props.initialValue)
		? 0
		: props.initialValue;
	props.onChange(initialValue);

	const [value, setValue] = createSignal(initialValue.toString());
	const [rawValue, setRawValue] = createSignal(initialValue);

	createEffect(() => {
		if (props.value !== undefined) {
			setValue(Math.round(props.value).toString());
			setRawValue(Math.round(props.value));
		}
	});

	let ref: HTMLInputElement;

	onMount(() => {
		createEventListener(ref, "wheel", (e) => {
			if (e.target === document.activeElement) e.stopPropagation();
		});
	});

	return (
		<NumberField<"div">
			onKeyDown={(e) => e.stopPropagation()}
			class="relative group"
			value={value()}
			onChange={setValue}
			rawValue={rawValue()}
			onRawValueChange={(v) => setRawValue(Math.round(v))}
			allowedInput={/^[0-9]*$/}
			changeOnWheel
			step={1}
		>
			<NumberField.Input<typeof Input>
				ref={ref!}
				onBlur={() => {
					batch(() => {
						if (value() === "") {
							setValue("0");
							setRawValue(0);
						} else if (Number.isNaN(rawValue())) {
							setValue(props.initialValue.toString());
							setRawValue(props.initialValue);
						}

						props.onChange(rawValue());
					});
				}}
				class={clsx("pr-4 group-focus-within:border-mg-focus", props.class)}
				as={(inputProps) => <Input {...inputProps} />}
			/>
			<div class="absolute right-0 top-0 flex flex-col justify-between bottom-0 p-1 gap-px">
				<NumberField.IncrementTrigger
					type="button"
					class="bg-white/20 flex items-center justify-center rounded-t-sm focus-visible:outline-yellow-400 focus-visible:outline"
					onClick={() => {
						queueMicrotask(() => props.onChange(rawValue()));
					}}
				>
					<IconMaterialSymbolsArrowDropUpRounded class="h-4 -my-1" />
				</NumberField.IncrementTrigger>
				<NumberField.DecrementTrigger
					type="button"
					class="bg-white/20 flex items-center justify-center rounded-b-sm focus-visible:outline-yellow-400 focus-visible:outline"
					onClick={() => {
						queueMicrotask(() => props.onChange(rawValue()));
					}}
				>
					<IconMaterialSymbolsArrowDropDownRounded class="h-4 -my-1" />
				</NumberField.DecrementTrigger>
			</div>
		</NumberField>
	);
};
