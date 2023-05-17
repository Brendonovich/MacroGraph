import clsx from "clsx";
import {
  DataInput,
  DataOutput,
  ListType,
  OptionType,
  PrimitiveVariant,
} from "@macrograph/core";
import { usePin } from ".";
import { Match, Switch } from "solid-js";

const DataPinTypeColours: Record<
  PrimitiveVariant,
  { active: string; base: string; border: string; bg: string; text: string }
> = {
  bool: {
    border: "border-red-bool",
    bg: "bg-red-bool",
    text: "text-red-bool",
    active: "border-red-bool bg-red-bool",
    base: "border-red-bool hover:bg-red-bool",
  },
  string: {
    border: "border-pink-string",
    bg: "bg-pink-string",
    text: "text-pink-string",
    active: "border-pink-string bg-pink-string",
    base: "border-pink-string hover:bg-pink-string",
  },
  int: {
    border: "border-blue-int",
    bg: "bg-blue-int",
    text: "text-blue-int",
    active: "border-blue-int bg-blue-int",
    base: "border-blue-int hover:bg-blue-int",
  },
  float: {
    border: "border-green-float",
    bg: "bg-green-float",
    text: "text-green-float",
    active: "border-green-float bg-green-float",
    base: "border-green-float hover:bg-green-float",
  },
};

interface Props {
  pin: DataInput | DataOutput;
}

export const DataPin = (props: Props) => {
  const pin = props.pin;

  const { ref, active } = usePin(pin);

  const colourClass = () =>
    DataPinTypeColours[pin.type.basePrimitive().primitiveVariant()];

  const connected = () =>
    pin instanceof DataInput
      ? pin.connection !== null
      : pin.connections.length > 0;

  const containerProps = () =>
    ({
      ref: ref,
      style: {
        "pointer-events": "all",
      },
    } as const);

  const containerRounding = () =>
    pin.type.variant() === "list" ? "rounded-[0.1875rem]" : "rounded-full";

  return (
    <Switch>
      <Match when={pin.type instanceof OptionType && pin.type}>
        {(typ) => (
          <div
            {...containerProps()}
            class={clsx(
              `w-3.5 h-3.5 flex justify-center items-center border-current`,
              containerRounding(),
              colourClass().text,
              connected() || active() ? "border-[2.5px]" : "border-[1.5px]"
            )}
          >
            <div
              class={clsx(
                "border-[1.5px] border-current",
                connected() || active() ? "w-1 h-1 bg-current" : "w-2 h-2",
                !(typ().getInner() instanceof ListType)
                  ? "rounded-full"
                  : "rounded-[0.0625rem]"
              )}
            />
          </div>
        )}
      </Match>
      <Match when={true}>
        <div
          {...containerProps()}
          class={clsx(
            `w-3.5 h-3.5 border-[2.5px]`,
            containerRounding(),
            connected() || active() ? colourClass().active : colourClass().base
          )}
        />
      </Match>
    </Switch>
  );
};
