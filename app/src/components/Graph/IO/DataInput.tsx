import clsx from "clsx";
import {
  AnyType,
  BasePrimitiveType,
  DataInput as DataInputModel,
  EnumType,
  EnumVariants,
  WildcardType,
} from "@macrograph/core";
import { Show, Switch, Match } from "solid-js";

import {
  CheckBox,
  EnumInput,
  FloatInput,
  IntInput,
  TextInput,
} from "~/components/ui";
import { DataPin } from ".";

interface InputProps {
  type: AnyType;
  value: any;
  onChange(v: any): void;
  connected: boolean;
}

const Input = (props: InputProps) => {
  const className = () =>
    clsx(props.connected && "opacity-0 pointer-events-none");

  return (
    <Switch>
      <Match
        when={
          props.type instanceof WildcardType &&
          props.type.wildcard.value().isSome() &&
          props.type
        }
      >
        {(type) => (
          <Input
            value={props.value}
            onChange={props.onChange}
            type={type().wildcard.value().unwrap()}
            connected={props.connected}
          />
        )}
      </Match>
      <Match when={props.type instanceof BasePrimitiveType && props.type}>
        {(type) => (
          <Switch>
            <Match when={type().primitiveVariant() === "bool"}>
              <CheckBox
                class={className()}
                value={props.value}
                onChange={props.onChange}
              />
            </Match>
            <Match when={type().primitiveVariant() === "string"}>
              <div class="w-16">
                <TextInput
                  class={className()}
                  value={props.value}
                  onChange={props.onChange}
                />
              </div>
            </Match>
            <Match when={type().primitiveVariant() === "int"}>
              <div class="w-16">
                <IntInput
                  class={className()}
                  value={props.value}
                  onChange={props.onChange}
                />
              </div>
            </Match>
            <Match when={type().primitiveVariant() === "float"}>
              <div class="w-16">
                <FloatInput
                  class={className()}
                  value={props.value}
                  onChange={props.onChange}
                />
              </div>
            </Match>
          </Switch>
        )}
      </Match>
      <Match when={props.type instanceof EnumType && props.type}>
        {(type) => (
          <div class="w-20 flex flex-row text-left">
            <EnumInput
              class={className()}
              enum={type().inner}
              value={
                (type().inner.variants as EnumVariants).find(
                  (v) => v.name === props.value?.variant
                ) ??
                (props.onChange(type().inner.variants[0].default()),
                type().inner.variants[0])
              }
              onChange={(v) => props.onChange(v.default())}
            />
          </div>
        )}
      </Match>
    </Switch>
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
      <Input
        type={props.input.type}
        value={props.input.defaultValue}
        onChange={(v) => props.input.setDefaultValue(v)}
        connected={props.input.connection !== null}
      />
    </div>
  );
};
