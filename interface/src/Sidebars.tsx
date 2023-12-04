import {
  BasePrimitiveType,
  BaseType,
  Graph,
  Node,
  PrimitiveType,
  PropertyValue,
  t,
} from "@macrograph/core";
import { Switch, For, Match, Show, createMemo, createSignal } from "solid-js";
import { AiOutlineCheck, AiOutlineDelete, AiOutlineEdit } from "solid-icons/ai";
import { BsX } from "solid-icons/bs";

import { SidebarSection } from "./components/Sidebar";
import {
  CheckBox,
  FloatInput,
  IntInput,
  SelectInput,
  TextInput,
} from "./components/ui";
import { TypeEditor } from "./components/TypeEditor";

export function GraphSidebar(props: { graph: Graph }) {
  return (
    <>
      <SidebarSection
        title="Variables"
        right={
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();

              props.graph.createVariable({
                name: `Variable ${props.graph.variables.length + 1}`,
                value: 0,
                type: t.string(),
              });
            }}
          >
            +
          </button>
        }
      >
        <div class="p-2 gap-2 flex flex-col">
          <For each={props.graph.variables}>
            {(variable) => {
              const [editingName, setEditingName] = createSignal(false);

              return (
                <div class="flex flex-col gap-2 p-2 border-neutral-400 border rounded bg-neutral-800">
                  <div class="flex flex-row gap-2 justify-between items-center">
                    <Switch>
                      <Match when={editingName()}>
                        {(_) => {
                          const [value, setValue] = createSignal(variable.name);

                          return (
                            <>
                              <input
                                class="flex-1 text-black"
                                value={value()}
                                onChange={(e) => setValue(e.target.value)}
                              />
                              <div class="flex flex-row">
                                <button
                                  class="w-6 h-6 flex flex-row items-center justify-center"
                                  onClick={() => {
                                    variable.name = value();
                                    setEditingName(false);
                                  }}
                                >
                                  <AiOutlineCheck />
                                </button>
                                <button
                                  class="w-6 h-6 relative"
                                  onClick={() => setEditingName(false)}
                                >
                                  <BsX
                                    size={24}
                                    class="absolute left-0 top-0"
                                  />
                                </button>
                              </div>
                            </>
                          );
                        }}
                      </Match>
                      <Match when={!editingName()}>
                        <span class="shrink-0">{variable.name}</span>
                        <div class="gap-2 flex flex-row">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();

                              setEditingName(true);
                            }}
                          >
                            <AiOutlineEdit />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();

                              props.graph.removeVariable(variable.id);
                            }}
                          >
                            <AiOutlineDelete />
                          </button>
                        </div>
                      </Match>
                    </Switch>
                  </div>

                  <TypeEditor
                    type={variable.type}
                    onChange={(type) => {
                      variable.type = type;
                      variable.value = type.default();
                    }}
                  />

                  <Show
                    when={
                      variable.type instanceof BasePrimitiveType &&
                      variable.type
                    }
                  >
                    {(type) => (
                      <div class="flex flex-row items-center gap-2 text-sm">
                        <span>Value</span>
                        <Switch>
                          <Match when={type().primitiveVariant() === "bool"}>
                            <CheckBox
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "string"}>
                            <TextInput
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "int"}>
                            <IntInput
                              initialValue={variable.value}
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "float"}>
                            <FloatInput
                              initialValue={variable.value}
                              value={variable.value}
                              onChange={(n) =>
                                props.graph.setVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                        </Switch>
                      </div>
                    )}
                  </Show>
                  <Show
                    when={variable.type instanceof BaseType && variable.type}
                  >
                    {(type) => (
                      <Switch>
                        <Match
                          when={
                            type().variant() === "list" ||
                            type().variant() === "map"
                          }
                        >
                          {" "}
                          <div class="flex flex-row items-center gap-2 text-sm">
                            <span>Value2</span>
                            <span>{JSON.stringify(variable.value)}</span>
                          </div>
                        </Match>
                      </Switch>
                    )}
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </SidebarSection>
    </>
  );
}

export function NodeSidebar(props: { node: Node }) {
  return (
    <>
      <SidebarSection title="Node Info" class="p-2 space-y-2">
        <p>Name: {props.node.state.name}</p>
      </SidebarSection>
      <Show
        when={"properties" in props.node.schema && props.node.schema.properties}
      >
        {(properties) => (
          <SidebarSection title="Node Properties">
            <For each={Object.values(properties())}>
              {(property) => {
                const properties = createMemo(
                  () => props.node.state.properties
                );

                return (
                  <div class="p-2 flex flex-row gap-2 items-center">
                    <Switch>
                      <Match when={"source" in property && property}>
                        {(property) => {
                          const options = () => {
                            return property().source({ node: props.node });
                          };

                          const selectedOption = () => {
                            return options().find(
                              (o) => o.id === properties()[property().id]!
                            );
                          };

                          return (
                            <>
                              <span>{property().name}</span>
                              <SelectInput<PropertyValue>
                                options={options()}
                                optionValue="id"
                                optionTextValue="display"
                                getLabel={(o) => o.display}
                                value={selectedOption()}
                                onChange={(v) => {
                                  props.node.setProperty(property().id, v.id);
                                }}
                              />
                            </>
                          );
                        }}
                      </Match>
                      <Match when={"type" in property && property}>
                        {(property) => {
                          const value = createMemo(
                            () => properties()[property().id]!
                          );

                          const onChange = (v: any) => {
                            props.node.setProperty(property().id, v);
                          };

                          return (
                            <>
                              <span>{property().name}</span>
                              <Switch>
                                <Match
                                  when={
                                    property().type.primitiveVariant() ===
                                    "bool"
                                  }
                                >
                                  <CheckBox
                                    value={value()}
                                    onChange={onChange}
                                  />
                                </Match>
                                <Match
                                  when={
                                    property().type.primitiveVariant() ===
                                    "string"
                                  }
                                >
                                  <TextInput
                                    value={value()}
                                    onChange={onChange}
                                  />
                                </Match>
                                <Match
                                  when={
                                    property().type.primitiveVariant() === "int"
                                  }
                                >
                                  <IntInput
                                    initialValue={value()}
                                    value={value()}
                                    onChange={onChange}
                                  />
                                </Match>
                                <Match
                                  when={
                                    property().type.primitiveVariant() ===
                                    "float"
                                  }
                                >
                                  <FloatInput
                                    initialValue={value()}
                                    value={value()}
                                    onChange={onChange}
                                  />
                                </Match>
                              </Switch>
                            </>
                          );
                        }}
                      </Match>
                    </Switch>
                  </div>
                );
              }}
            </For>
          </SidebarSection>
        )}
      </Show>
    </>
  );
}
