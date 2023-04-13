import clsx from "clsx";
import { DataInput as DataInputModel } from "@macrograph/core";
import { Show, Switch, Match } from "solid-js";

import { CheckBox, FloatInput, IntInput, TextInput } from "~/components/ui";
import { DataPin } from ".";

const UnconnectedInput = (props: Props) => {
  const input = props.input;

  const className = () =>
    clsx(input.connection !== null && "opacity-0 pointer-events-none");

  return (
    <Show when={!Array.isArray(input.defaultValue) && input.defaultValue}>
      {(dv) => (
        <Switch>
          <Match when={dv().type === "bool"}>
            <CheckBox
              class={className()}
              value={dv().value as any}
              onChange={(value) =>
                input.setDefaultValue({ type: "bool", value })
              }
            />
          </Match>
          <Match when={dv().type === "string"}>
            <div class="w-16">
              <TextInput
                class={className()}
                value={dv().value as any}
                onChange={(value) =>
                  input.setDefaultValue({ type: "string", value })
                }
              />
            </div>
          </Match>
          <Match when={dv().type === "int"}>
            <div class="w-16">
              <IntInput
                class={className()}
                value={dv().value as any}
                onChange={(value) =>
                  input.setDefaultValue({ type: "int", value })
                }
              />
            </div>
          </Match>
          <Match when={dv().type === "float"}>
            <div class="w-16">
              <FloatInput
                class={className()}
                value={dv().value as any}
                onChange={(value) =>
                  input.setDefaultValue({ type: "float", value })
                }
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
