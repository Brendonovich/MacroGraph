import { Select } from "@kobalte/core";
import type { Enum, EnumVariants } from "@macrograph/typesystem";
import clsx from "clsx";
import type { ComponentProps } from "solid-js";

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
			optionValue="id"
			getLabel={(o) => o?.name ?? o?.id}
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
				if (!v) return;
				props.onChange(v);
			}}
			multiple={false}
			class={clsx("w-full text-xs h-5", props.class)}
			placeholder={<span class="opacity-70 font-italic">No value</span>}
			itemComponent={(itemProps) => (
				<Select.Item
					item={itemProps.item}
					as="button"
					class="p-1 py-0.5 block w-full text-left focus-visible:outline-none ui-highlighted:bg-blue-600 rounded-[0.125rem]"
				>
					<Select.ItemLabel>
						{props.getLabel(itemProps.item.rawValue)}
					</Select.ItemLabel>
				</Select.Item>
			)}
		>
			<Select.Trigger class="w-full text-left pl-1 py-0.5 gap-0.5 rounded bg-neutral-700 ui-expanded:border-mg-focus focus:outline-none focus:ring-1 focus:ring-mg-focus appearance-none flex flex-row items-center justify-between whitespace-nowrap">
				<Select.Value<TOption> class="overflow-hidden">
					{(state) => props.getLabel(state.selectedOption())}
				</Select.Value>
				<Select.Icon
					as={IconMaterialSymbolsArrowRightRounded}
					class="size-4 ui-closed:rotate-90 mr-1 ui-expanded:-rotate-90 transition-transform"
				/>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content class="ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 overflow-y-hidden text-xs bg-neutral-700 rounded space-y-1 p-1">
					<Select.Listbox class="focus-visible:outline-none max-h-[12rem] overflow-y-auto" />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
}
