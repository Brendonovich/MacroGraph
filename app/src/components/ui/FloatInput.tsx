import clsx from "clsx";
import { createSignal } from "solid-js";

interface Props {
  value: number;
  onChange(v: number): void;
  class?: string;
}

// floating point regex
const FLOAT_REGEX = /^[+-]?\d*(\.\d+)?$/;

export const FloatInput = (props: Props) => {
  const [value, setValue] = createSignal(props.value.toString());

  return (
    <input
      type="text"
      value={value()}
      onChange={(e) => {
        const value = e.target.value;
        setValue(value);

        if (FLOAT_REGEX.test(value)) props.onChange(parseInt(value));
      }}
      onBlur={(e) => {
        if (e.target.value.length === 0) {
          setValue("0");
          props.onChange(0);
        } else if (!FLOAT_REGEX.test(e.target.value)) {
          setValue(props.value.toString());
        }
      }}
      class={clsx(
        "w-full text-xs h-5 px-1 border border-gray-300 rounded bg-black focus:border-yellow-500 focus:ring-0",
        props.class
      )}
    />
  );
};
