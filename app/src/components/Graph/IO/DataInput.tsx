import clsx from "clsx";
import { DataInput as DataInputModel, PrimitiveType } from "@macrograph/core";
import { Show, Switch, Match } from "solid-js";

import { CheckBox, FloatInput, IntInput, TextInput } from "~/components/ui";
import { DataPin } from ".";

const UnconnectedInput = (props: Props) => {
  const input = props.input;

  const className = () =>
    clsx(input.connection !== null && "opacity-0 pointer-events-none");

  return (
    <Show when={input.type instanceof PrimitiveType && input.type}>
      {(type) => (
        <Switch>
          <Match when={type().primitiveVariant() === "bool"}>
            <CheckBox
              class={className()}
              value={input.defaultValue}
              onChange={input.setDefaultValue}
            />
          </Match>
          <Match when={type().primitiveVariant() === "string"}>
            <div class="w-16">
              <TextInput
                class={className()}
                value={input.defaultValue}
                onChange={input.setDefaultValue}
              />
            </div>
          </Match>
          <Match when={type().primitiveVariant() === "int"}>
            <div class="w-16">
              <IntInput
                class={className()}
                value={input.defaultValue}
                onChange={input.setDefaultValue}
              />
            </div>
          </Match>
          <Match when={type().primitiveVariant() === "float"}>
            <div class="w-16">
              <FloatInput
                class={className()}
                value={input.defaultValue}
                onChange={input.setDefaultValue}
              />
            </div>
          </Match>
        </Switch>
      )}
    </Show>
  );
};

interface Props {
  input: DataInputModel;
}

export const DataInput = (props: Props) => {
  return (
    <div class="flex flex-row items-center space-x-1.5 h-5">
      <DataPin pin={props.input} />
      <span>{props.input.name}</span>
      <Show when={props.input.type.variant() === "primitive"}>
        <UnconnectedInput input={props.input} />
      </Show>
    </div>
  );
};
