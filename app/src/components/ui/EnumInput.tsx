import { Enum, EnumVariants } from "@macrograph/core";
import { Select } from "@kobalte/core";
import clsx from "clsx";

interface Props<T extends Enum<EnumVariants>> {
  enum: T;
  value: T["variants"][number];
  onChange(v: T["variants"][number]): void;
  class?: string;
}

export const EnumInput = <T extends Enum<EnumVariants>>(props: Props<T>) => (
  <Select.Root<T["variants"][number]["name"]>
    class={clsx("w-full text-xs h-5", props.class)}
    options={props.enum.variants.map((v) => v.name)}
    value={props.value.name}
    onChange={(value) =>
      props.onChange(props.enum.variants.find((v) => v.name === value)!)
    }
    itemComponent={(itemProps) => (
      <Select.Item
        item={itemProps.item}
        as="button"
        class={clsx(
          "px-1 py-0.5 block w-full text-left",
          props.value.name === itemProps.item.rawValue && "bg-neutral-700"
        )}
      >
        <Select.ItemLabel>{itemProps.item.rawValue}</Select.ItemLabel>
      </Select.Item>
    )}
  >
    <Select.Trigger class="w-full h-full text-left pl-1 border border-gray-300 rounded bg-black ui-expanded:border-yellow-500 focus:outline-none appearance-none">
      <Select.Value<T["variants"][number]["name"]>>
        {(state) => state.selectedOption()}
      </Select.Value>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Listbox class="bg-black border border-gray-300 text-white rounded text-xs overflow-hidden" />
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
