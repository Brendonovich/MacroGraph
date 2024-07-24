import clsx from "clsx";
import { batch, createEffect, createSignal } from "solid-js";

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

  let ref: HTMLInputElement;

  return (
    <div class="relative">
      <Input
        ref={ref!}
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
        class={clsx("pr-4", props.class)}
      />
      <div class="absolute right-0 top-0 flex flex-col justify-between bottom-0 p-1 gap-px">
        <button
          type="button"
          class="bg-white/20 flex items-center justify-center rounded-t-sm focus-visible:outline-yellow-400 focus-visible:outline"
          onClick={() => {
            batch(() => {
              const val = (props.value ?? 0) + 1;
              console.log({ val });
              props.onChange(val);
              setValue(val.toString());
            });
          }}
        >
          <IconMaterialSymbolsArrowDropUpRounded class="h-4 -my-1" />
        </button>
        <button
          type="button"
          class="bg-white/20 flex items-center justify-center rounded-b-sm focus-visible:outline-yellow-400 focus-visible:outline"
          onClick={() => {
            batch(() => {
              const val = (props.value ?? 0) - 1;
              props.onChange(val);
              setValue(val.toString());
            });
          }}
        >
          <IconMaterialSymbolsArrowDropDownRounded class="h-4 -my-1" />
        </button>
      </div>
    </div>
  );
};
