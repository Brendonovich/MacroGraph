import clsx from "clsx";
import { DataInput, DataOutput } from "~/models";
import { PrimitiveType } from "~/bindings";
import { usePin } from ".";

const DataPinTypeColours: Record<
  PrimitiveType,
  { active: string; base: string }
> = {
  bool: {
    active: "border-red-bool bg-red-bool",
    base: "border-red-bool hover:bg-red-bool",
  },
  string: {
    active: "border-pink-string bg-pink-string",
    base: "border-pink-string hover:bg-pink-string",
  },
  int: {
    active: "border-blue-int bg-blue-int",
    base: "border-blue-int hover:bg-blue-int",
  },
  float: {
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
    DataPinTypeColours[
      pin.type.variant === "primitive" ? pin.type.value : pin.type.value.value
    ];

  const connected = () =>
    pin instanceof DataInput
      ? pin.connection !== null
      : pin.connections.length > 0;

  return (
    <div
      ref={ref}
      style={{
        "pointer-events": "all",
      }}
      class={clsx(
        `w-3.5 h-3.5 border-2`,
        pin.type.variant !== "primitive" ? "rounded-sm" : "rounded-full",
        connected() || active() ? colourClass().active : colourClass().base
      )}
    />
  );
};
