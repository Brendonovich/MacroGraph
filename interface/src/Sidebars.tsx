import { Graph, Node, PrimitiveType, PropertyValue, t } from "@macrograph/core";
import { SidebarSection } from "./components/Sidebar";
import { For, Match, Show, createMemo } from "solid-js";
import {
  CheckBox,
  FloatInput,
  IntInput,
  SelectInput,
  TextInput,
} from "./components/ui";
import { Switch } from "solid-js";

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
            {(variable) => (
              <div class="flex flex-col gap-2 p-2 border-neutral-400 border rounded bg-neutral-800">
                <div class="flex flex-row gap-2 justify-start items-center">
                  <span class="shrink-0">{variable.name}</span>
                  <SelectInput<PrimitiveType>
                    options={[t.string(), t.int(), t.float(), t.bool()]}
                    optionValue={(o) => o.primitiveVariant()}
                    optionTextValue={(o) => o.toString()}
                    value={variable.type}
                    getLabel={(v) => v.toString()}
                    onChange={(v) => {
                      if (variable.type.eq(v)) return;

                      variable.type = v;
                      variable.value = v.default();
                    }}
                  />
                </div>
                <Switch>
                  <Match when={variable.type.primitiveVariant() === "bool"}>
                    <CheckBox
                      value={variable.value}
                      onChange={(n) =>
                        props.graph.setVariableValue(variable.id, n)
                      }
                    />
                  </Match>
                  <Match when={variable.type.primitiveVariant() === "string"}>
                    <TextInput
                      value={variable.value}
                      onChange={(n) =>
                        props.graph.setVariableValue(variable.id, n)
                      }
                    />
                  </Match>
                  <Match when={variable.type.primitiveVariant() === "int"}>
                    <IntInput
                      initialValue={variable.value}
                      value={variable.value}
                      onChange={(n) =>
                        props.graph.setVariableValue(variable.id, n)
                      }
                    />
                  </Match>
                  <Match when={variable.type.primitiveVariant() === "float"}>
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
                const properties = createMemo(() => {
                  return props.node.state.properties;
                });

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
                        {(property) => (
                          <Switch>
                            <Match
                              when={(() => {
                                const value = property();

                                if (value.type instanceof t.String)
                                  return {
                                    ...value,
                                    type: value.type,
                                  };
                              })()}
                            >
                              {(property) => (
                                <>
                                  <span>{property().name}</span>
                                  <TextInput
                                    value={properties()[property().id]!}
                                    onChange={(v) => {
                                      props.node.setProperty(property().id, v);
                                    }}
                                  />
                                </>
                              )}
                            </Match>
                          </Switch>
                        )}
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
