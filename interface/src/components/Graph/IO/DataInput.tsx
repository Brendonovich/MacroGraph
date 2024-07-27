import type { DataInput as DataInputModel } from "@macrograph/runtime";
import {
  type AnyType,
  BasePrimitiveType,
  type BaseType,
  type Enum,
  EnumType,
  type EnumVariants,
  type PrimitiveType,
  WildcardType,
  type t,
} from "@macrograph/typesystem";
import { Match, Show, Switch } from "solid-js";
import {
  createQuery,
  keepPreviousData,
  skipToken,
} from "@tanstack/solid-query";

import { DataPin } from ".";
import { CheckBox, EnumInput, FloatInput, IntInput, TextInput } from "../../ui";

type EnumValue = t.infer<t.Enum<Enum<EnumVariants>>>;

interface InputProps {
  type: AnyType;
  value: t.infer<PrimitiveType> | EnumValue | null;
  onChange(v: t.infer<PrimitiveType>): void;
  connected: boolean;
  input: DataInputModel<any>;
}

const Input = (props: InputProps) => {
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
            input={props.input}
          />
        )}
      </Match>
      <Match
        when={
          props.type instanceof BasePrimitiveType &&
          props.value !== null &&
          props.type
        }
        keyed
      >
        {(type) => (
          <Switch>
            <Match when={type.primitiveVariant() === "bool"}>
              <Show when={!props.connected}>
                <CheckBox
                  value={props.value as boolean}
                  onChange={props.onChange}
                />
              </Show>
            </Match>
            <Match when={type.primitiveVariant() === "string"}>
              <div class="w-16">
                <Show when={!props.connected}>
                  {(_) => {
                    const suggestionsQuery = createQuery(() => ({
                      queryKey: [
                        "inputSuggesions",
                        {
                          graph: props.input.node.graph.id,
                          node: props.input.node.id,
                          input: props.input.id,
                        },
                      ],
                      queryFn: () =>
                        props.input
                          .fetchSuggestions?.()
                          .catch(() => [] as string[]),
                      refetchOnMount: false,
                      refetchOnReconnect: false,
                      refetchOnWindowFocus: false,
                      placeholderData: keepPreviousData,
                    }));

                    return (
                      <TextInput
                        value={props.value as string}
                        onChange={props.onChange}
                        suggestionsQuery={suggestionsQuery}
                      />
                    );
                  }}
                </Show>
              </div>
            </Match>
            <Match when={type.primitiveVariant() === "int"}>
              <div class="w-16">
                <Show when={!props.connected}>
                  <IntInput
                    initialValue={
                      props.value ? Number.parseInt(props.value.toString()) : 0
                    }
                    onChange={props.onChange}
                  />
                </Show>
              </div>
            </Match>
            <Match when={type.primitiveVariant() === "float"}>
              <div class="w-16">
                <Show when={!props.connected}>
                  <FloatInput
                    initialValue={
                      props.value
                        ? Number.parseFloat(props.value.toString())
                        : 0
                    }
                    onChange={props.onChange}
                  />
                </Show>
              </div>
            </Match>
          </Switch>
        )}
      </Match>
      <Match when={props.type instanceof EnumType && props.type}>
        {(type) => (
          <div class="w-20 flex flex-row text-left">
            <Show when={!props.connected}>
              <EnumInput
                enum={type().inner}
                value={(() => {
                  const variant = (type().inner.variants as EnumVariants).find(
                    (v) => v.name === (props.value as EnumValue)?.variant
                  );
                  if (variant) return variant;

                  props.onChange(type().inner.variants[0].default());
                  return type().inner.variants[0];
                })()}
                onChange={(v) => props.onChange(v.default())}
              />
            </Show>
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
        input={props.input}
      />
    </div>
  );
};
