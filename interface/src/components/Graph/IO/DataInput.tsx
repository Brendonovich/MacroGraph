import clsx from "clsx";
import { DataInput as DataInputModel } from "@macrograph/runtime";
import {
  AnyType,
  BasePrimitiveType,
  BaseType,
  Enum,
  EnumType,
  EnumVariants,
  PrimitiveType,
  WildcardType,
  t,
} from "@macrograph/typesystem";
import { Show, Switch, Match } from "solid-js";

import { CheckBox, EnumInput, FloatInput, IntInput, TextInput } from "../../ui";
import { DataPin } from ".";

type EnumValue = t.infer<t.Enum<Enum<EnumVariants>>>;

interface InputProps {
  type: AnyType;
  value: t.infer<PrimitiveType> | EnumValue | null;
  onChange(v: t.infer<PrimitiveType>): void;
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
      <Match
        when={
          props.type instanceof BasePrimitiveType &&
          props.value !== null &&
          props.type
        }
      >
        {(type) => (
          <Switch>
            <Match when={type().primitiveVariant() === "bool"}>
              <CheckBox
                class={className()}
                value={props.value as boolean}
                onChange={props.onChange}
              />
            </Match>
            <Match when={type().primitiveVariant() === "string"}>
              <div class="w-16">
                <TextInput
                  class={className()}
                  value={props.value as string}
                  onChange={props.onChange}
                />
              </div>
            </Match>
            <Match when={type().primitiveVariant() === "int"}>
              <div class="w-16">
                <IntInput
                  class={className()}
                  initialValue={
                    props.value ? parseInt(props.value.toString()) : 0
                  }
                  onChange={props.onChange}
                />
              </div>
            </Match>
            <Match when={type().primitiveVariant() === "float"}>
              <div class="w-16">
                <FloatInput
                  class={className()}
                  initialValue={
                    props.value ? parseFloat(props.value.toString()) : 0
                  }
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
                  (v) => v.name === (props.value as EnumValue)?.variant
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
  input: DataInputModel<BaseType>;
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
        connected={props.input.connection.isSome()}
      />
    </div>
  );
};
