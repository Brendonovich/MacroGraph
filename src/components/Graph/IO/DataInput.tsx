import clsx from "clsx";

import { CheckBox, FloatInput, IntInput, TextInput } from "~/components/ui";
import { DataInput as DataInputModel } from "~/models";
import { DataPin } from ".";

const UnconnectedInput = (props: Props) => {
  const input = props.input;
  const connected = input.connection !== null;
  const className = clsx(connected && "opacity-0 pointer-events-none");

  switch (input.defaultValue?.type) {
    case "bool": {
      return (
        <CheckBox
          class={className}
          value={input.defaultValue.value}
          onChange={(value) => input.setDefaultValue({ type: "bool", value })}
        />
      );
    }
    case "string": {
      return (
        <div class="w-16">
          <TextInput
            class={className}
            value={input.defaultValue.value}
            onChange={(value) =>
              input.setDefaultValue({ type: "string", value })
            }
          />
        </div>
      );
    }
    case "int": {
      return (
        <div class="w-16">
          <IntInput
            class={className}
            value={input.defaultValue.value}
            onChange={(value) => input.setDefaultValue({ type: "int", value })}
          />
        </div>
      );
    }
    case "float": {
      return (
        <div class="w-16">
          <FloatInput
            class={className}
            value={input.defaultValue.value}
            onChange={(value) =>
              input.setDefaultValue({ type: "float", value })
            }
          />
        </div>
      );
    }
  }
};

interface Props {
  input: DataInputModel;
}

export const DataInput = (props: Props) => {
  const input = props.input;

  return (
    <div class="flex flex-row items-center space-x-1.5 h-5">
      <DataPin pin={input} />
      <span>{input.name}</span>
      {input.type.variant === "primitive" && <UnconnectedInput input={input} />}
    </div>
  );
};
