import clsx from "clsx";
import {
  AnyType,
  DataInput,
  DataOutput,
  ListType,
  OptionType,
  WildcardType,
} from "@macrograph/core";
import { usePin } from ".";
import { Match, Switch } from "solid-js";
import { Tooltip } from "@kobalte/core";
import { colour } from "../util";

interface Props {
  pin: DataInput | DataOutput;
}

export const DataPin = (props: Props) => {
  const pin = props.pin;

  const { ref, active } = usePin(pin);

  const connected = () =>
    pin instanceof DataInput
      ? pin.connection !== null
      : pin.connections.size > 0;

  const containerProps = () =>
    ({
      ref: ref,
      style: {
        "pointer-events": "all",
      },
    } as const);

  const rounding = (type: AnyType): string => {
    if (type instanceof ListType) {
      return "rounded-[0.1875rem]";
    }

    if (type instanceof WildcardType) {
      const value = type.wildcard.value;

      if (value.isSome()) {
        return rounding(value.unwrap());
      }
    }

    return "rounded-full";
  };

  const innerType = {
    get value() {
      if (pin.type instanceof WildcardType) {
        return pin.type.wildcard.value.unwrapOr(pin.type);
      } else return pin.type;
    },
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger class="cursor-auto">
        <Switch>
          <Match
            when={innerType.value instanceof OptionType && innerType.value}
          >
            {(type) => {
              return (
                <div
                  {...containerProps()}
                  class={clsx(
                    `w-3.5 h-3.5 flex justify-center items-center border-mg-current`,
                    rounding(type()),
                    colour(type()),
                    connected() || active()
                      ? "border-[2.5px]"
                      : "border-[1.5px]"
                  )}
                >
                  <div
                    class={clsx(
                      "border-[1.5px] border-mg-current",
                      connected() || active()
                        ? "w-1 h-1 bg-mg-current"
                        : "w-2 h-2",
                      !(type().getInner() instanceof ListType)
                        ? "rounded-full"
                        : "rounded-[0.0625rem]"
                    )}
                  />
                </div>
              );
            }}
          </Match>
          <Match when={pin.type}>
            {(type) => {
              return (
                <div
                  {...containerProps()}
                  class={clsx(
                    `w-3.5 h-3.5 border-[2.5px]`,
                    rounding(type()),
                    colour(type()),
                    connected() || active()
                      ? "border-mg-current bg-mg-current"
                      : "border-mg-current"
                  )}
                />
              );
            }}
          </Match>
        </Switch>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="bg-black min-w-[2.5rem] text-center text-white text-xs px-1 py-0.5 rounded border border-gray-500">
          <Tooltip.Arrow />
          {pin.type.toString()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
