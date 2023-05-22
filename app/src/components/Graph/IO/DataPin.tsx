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

  return (
    <Switch>
      <Match when={pin.type instanceof OptionType && pin.type}>
        {(type) => {
          return (
            <div
              {...containerProps()}
              class={clsx(
                `w-3.5 h-3.5 flex justify-center items-center border-current`,
                rounding(type()),
                colour(type()),
                connected() || active() ? "border-[2.5px]" : "border-[1.5px]"
              )}
            >
              <div
                class={clsx(
                  "border-[1.5px] border-current",
                  connected() || active() ? "w-1 h-1 bg-current" : "w-2 h-2",
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
                  ? "border-current bg-current"
                  : "border-current hover:border-current"
              )}
            />
          );
        }}
      </Match>
    </Switch>
  );
};
