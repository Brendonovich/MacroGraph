import clsx from "clsx";
import {
  BasePrimitiveType,
  DataInput as DataInputModel,
} from "@macrograph/core";
import { Show, Switch, Match } from "solid-js";

import { CheckBox, FloatInput, IntInput, TextInput } from "~/components/ui";
import { DataPin } from ".";

const UnconnectedInput = (props: Props) => {
  const input = props.input;

  const className = () =>
    clsx(input.connection !== null && "opacity-0 pointer-events-none");

  return (
    <Show when={input.type instanceof BasePrimitiveType && input.type}>
      {(type) => (
        <Switch>
          <Match when={type().primitiveVariant() === "bool"}>
            <CheckBox
              class={className()}
              value={input.defaultValue}
              onChange={(value) => input.setDefaultValue(value)}
            />
          </Match>
          <Match when={type().primitiveVariant() === "string"}>
            <div class="w-16">
              <TextInput
                class={className()}
                value={input.defaultValue}
                onChange={(value) => input.setDefaultValue(value)}
              />
            </div>
          </Match>
          <Match when={type().primitiveVariant() === "int"}>
            <div class="w-16">
              <IntInput
                class={className()}
                value={input.defaultValue}
                onChange={(value) => input.setDefaultValue(value)}
              />
            </div>
          </Match>
          <Match when={type().primitiveVariant() === "float"}>
            <div class="w-16">
              <FloatInput
                class={className()}
                value={input.defaultValue}
                onChange={(value) => input.setDefaultValue(value)}
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
      <Show when={props.input.name}>{(name) => <span>{name()}</span>}</Show>
      <Show when={props.input.type.variant() === "primitive"}>
        <UnconnectedInput input={props.input} />
      </Show>
    </div>
  );
};
