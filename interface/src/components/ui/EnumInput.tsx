import { Enum, EnumVariants } from "@macrograph/typesystem";
import { Select } from "@kobalte/core";
import clsx from "clsx";
import { ComponentProps } from "solid-js";

interface Props<T extends Enum<EnumVariants>>
	extends Omit<
		SelectInputProps<T["variants"][number]>,
		"getLabel" | "options"
	> {
	enum: T;
}

export function EnumInput<T extends Enum<EnumVariants>>(props: Props<T>) {
	return (
		<SelectInput
			{...props}
			options={props.enum.variants}
			optionValue="name"
			getLabel={(o) => o.name}
		/>
	);
}

interface SelectInputProps<TOption>
	extends Pick<
		ComponentProps<typeof Select.Root<TOption>>,
		"optionValue" | "optionTextValue"
	> {
	options: Array<TOption>;
	getLabel(option: TOption): string;
	value?: TOption;
	onChange(v: TOption): void;
	class?: string;
}

export function SelectInput<TOption>(props: SelectInputProps<TOption>) {
	return (
		<Select.Root<TOption>
			{...props}
			onChange={(v) => {
				if (v === undefined) return;
				props.onChange(v);
			}}
			multiple={false}
			class={clsx("w-full text-xs h-5", props.class)}
			itemComponent={(itemProps) => (
				<Select.Item
					item={itemProps.item}
					as="button"
					class={clsx(
						"px-1 py-0.5 block w-full text-left",
						props.value === itemProps.item.rawValue && "bg-neutral-700",
					)}
				>
					<Select.ItemLabel>
						{props.getLabel(itemProps.item.rawValue)}
					</Select.ItemLabel>
				</Select.Item>
			)}
		>
			<Select.Trigger class="w-full h-full text-left pl-1 border border-neutral-500 rounded bg-black ui-expanded:border-yellow-500 focus:outline-none appearance-none">
				<Select.Value<TOption>>
					{(state) => props.getLabel(state.selectedOption())}
				</Select.Value>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content>
					<Select.Listbox class="bg-black border border-neutral-300 text-white rounded text-xs overflow-hidden" />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
}
