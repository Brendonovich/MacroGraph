import { Variable } from "@macrograph/runtime";
import { Card } from "@macrograph/ui";
import { BasePrimitiveType, serializeValue, t } from "@macrograph/typesystem";
import { For, Match, Switch, batch, createSignal } from "solid-js";

import { SidebarSection } from "../components/Sidebar";
import { TypeEditor } from "../components/TypeEditor";
import { CheckBox, FloatInput, IntInput, TextInput } from "../components/ui";

export function Variables(props: {
  titlePrefix: string;
  variables: Array<Variable>;
  onCreateVariable(): void;
  onRemoveVariable(id: number): void;
  onSetVariableValue(id: number, value: any): void;
}) {
  return (
    <SidebarSection
      title={`${props.titlePrefix} Variables`}
      right={
        <button
          onClick={(e) => {
            e.stopPropagation();

            props.onCreateVariable();
          }}
        >
          <IconMaterialSymbolsAddRounded class="w-6 h-6" />
        </button>
      }
    >
      <ul class="p-2 gap-2 flex flex-col">
        <For each={props.variables}>
          {(variable) => {
            const [editingName, setEditingName] = createSignal(false);

            return (
              <Card as="li" class="p-2 space-y-2">
                <div class="flex flex-row gap-2 justify-between items-center">
                  <Switch>
                    <Match when={editingName()}>
                      {(_) => {
                        const [value, setValue] = createSignal(variable.name);

                        return (
                          <>
                            <input
                              class="flex-1 text-black -ml-1 pl-1"
                              value={value()}
                              onChange={(e) => setValue(e.target.value)}
                            />
                            <div class="flex flex-row space-x-1">
                              <button
                                onClick={() => {
                                  variable.name = value();
                                  setEditingName(false);
                                }}
                              >
                                <IconAntDesignCheckOutlined class="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingName(false)}>
                                <IconAntDesignCloseOutlined class="w-4 h-4" />
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
                          <IconAntDesignEditOutlined class="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            props.onRemoveVariable(variable.id);
                          }}
                        >
                          <IconAntDesignDeleteOutlined class="w-4 h-4" />
                        </button>
                      </div>
                    </Match>
                  </Switch>
                </div>

                <TypeEditor
                  type={variable.type}
                  onChange={(type) => {
                    batch(() => {
                      variable.type = type;
                      variable.value = type.default();
                    });
                  }}
                />

                <div class="flex flex-row items-start gap-2 text-sm">
                  <Switch>
                    <Match
                      when={
                        variable.type instanceof BasePrimitiveType &&
                        variable.type
                      }
                    >
                      {(type) => (
                        <Switch>
                          <Match when={type().primitiveVariant() === "bool"}>
                            <CheckBox
                              value={variable.value}
                              onChange={(n) =>
                                props.onSetVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "string"}>
                            <TextInput
                              value={variable.value}
                              onChange={(n) =>
                                props.onSetVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "int"}>
                            <IntInput
                              initialValue={variable.value}
                              value={variable.value}
                              onChange={(n) =>
                                props.onSetVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                          <Match when={type().primitiveVariant() === "float"}>
                            <FloatInput
                              initialValue={variable.value}
                              value={variable.value}
                              onChange={(n) =>
                                props.onSetVariableValue(variable.id, n)
                              }
                            />
                          </Match>
                        </Switch>
                      )}
                    </Match>
                    <Match
                      when={
                        variable.type instanceof t.List ||
                        variable.type instanceof t.Map
                      }
                    >
                      <div class="flex-1 whitespace-pre-wrap max-w-full">
                        {JSON.stringify(
                          serializeValue(variable.value, variable.type),
                          null,
                          4
                        )}
                      </div>
                    </Match>
                  </Switch>
                </div>
              </Card>
            );
          }}
        </For>
      </ul>
    </SidebarSection>
  );
}
