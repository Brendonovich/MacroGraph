import clsx from "clsx";
import { createEffect, createSignal } from "solid-js";
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

  createEffect(() => {
    if (props.value !== undefined) setValue(props.value.toString());
  });

  const [value, setValue] = createSignal(initialValue.toString());

  return (
    <Input
      type="text"
      value={value()}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onChange={(e) => {
        const value = e.target.value;

        setValue(value);

        const numValue = Number.parseInt(value);
        if (!Number.isNaN(numValue)) props.onChange(Number.parseInt(value));
      }}
      onBlur={(e) => {
        const s = e.target.value;
        const num = Number.parseInt(s);

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
