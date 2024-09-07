import type { Variable } from "@macrograph/runtime";
import { BasePrimitiveType, serializeValue, t } from "@macrograph/typesystem";
import {
  For,
  type JSX,
  Match,
  Show,
  Switch,
  type ValidComponent,
  createMemo,
  createSignal,
} from "solid-js";

import { ContextMenu } from "@kobalte/core/context-menu";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "../components/Graph/ContextMenu";
import { SidebarSection } from "../components/Sidebar";
import { TypeEditor } from "../components/TypeEditor";
import {
  CheckBox,
  FloatInput,
  IconButton,
  IntInput,
  TextInput,
} from "../components/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../util";
import {
  InlineTextEditor,
  InlineTextEditorContext,
  useInlineTextEditorCtx,
} from "./InlineTextEditor";
import { SearchInput } from "./SearchInput";

export function Variables(props: {
  titlePrefix: string;
  variables: Array<Variable>;
  onCreateVariable(): void;
  onRemoveVariable(id: number): void;
  onSetVariableValue(id: number, value: any): void;
  onSetVariableType(id: number, type: t.Any): void;
  onVariableNameChanged(id: number, name: string): void;
  contextMenu?: (id: number) => JSX.Element;
}) {
  const [search, setSearch] = createSignal("");

  const tokenisedFilters = createMemo(() =>
    props.variables.map((v) => [tokeniseString(v.name), v] as const),
  );

  const filteredVariables = createTokenisedSearchFilter(
    search,
    tokenisedFilters,
  );

  return (
    <SidebarSection title={`${props.titlePrefix} Variables`}>
      <div class="flex flex-row items-center w-full gap-1 p-1 border-b border-neutral-900">
        <SearchInput
          value={search()}
          onInput={(e) => {
            e.stopPropagation();
            setSearch(e.currentTarget.value);
          }}
        />
        <IconButton
          type="button"
          onClick={(e) => {
            e.stopPropagation();

            props.onCreateVariable();
          }}
        >
          <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
        </IconButton>
      </div>
      <div class="flex-1 overflow-y-auto">
        <ul class="flex flex-col divide-y divide-neutral-700 px-2">
          <For each={filteredVariables()}>
            {(variable) => (
              <li class="flex flex-col gap-1 flex-1 group/item py-2 pt-1">
                <InlineTextEditorContext>
                  <Show when>
                    {(_) => {
                      const inlineEditorContext = useInlineTextEditorCtx()!;

                      return (
                        <ContextMenu>
                          <InlineTextEditor<ValidComponent>
                            as={(asProps) => (
                              <ContextMenu.Trigger {...asProps} />
                            )}
                            value={variable.name}
                            onChange={(value) => {
                              props.onVariableNameChanged(variable.id, value);
                            }}
                          />
                          <ContextMenuContent>
                            <ContextMenuItem
                              onSelect={() =>
                                inlineEditorContext.setEditing(true)
                              }
                            >
                              <IconAntDesignEditOutlined /> Rename
                            </ContextMenuItem>
                            {props.contextMenu?.(variable.id)}
                            <ContextMenuItem
                              class="text-red-500"
                              onSelect={() => {
                                props.onRemoveVariable(variable.id);
                              }}
                            >
                              <IconAntDesignDeleteOutlined />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    }}
                  </Show>
                </InlineTextEditorContext>
                <div class="ui-closed:animate-accordion-up ui-expanded:animate-accordion-down transition-all overflow-hidden space-y-2 bg-black/30 p-2 rounded-md">
                  <TypeEditor
                    type={variable.type}
                    onChange={(type) => {
                      props.onSetVariableType(variable.id, type);
                    }}
                  />
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
                        variable.type instanceof t.Map ||
                        variable.type instanceof t.Struct
                      }
                    >
                      <div class="flex flex-row items-end gap-1 rounded p-1 bg-black/30">
                        <pre class="flex-1 whitespace-pre-wrap max-w-full text-xs">
                          {JSON.stringify(
                            serializeValue(variable.value, variable.type),
                            null,
                            2,
                          )}
                        </pre>
                        {(variable.type instanceof t.List
                          ? variable.value.length > 0
                          : variable.value.size > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (variable.type instanceof t.List)
                                props.onSetVariableValue(variable.id, []);
                              else if (variable.type instanceof t.Map)
                                props.onSetVariableValue(
                                  variable.id,
                                  new Map(),
                                );
                            }}
                          >
                            <IconSystemUiconsReset class="size-4" />
                          </button>
                        )}
                      </div>
                    </Match>
                  </Switch>
                </div>
              </li>
            )}
          </For>
        </ul>
      </div>
    </SidebarSection>
  );
}
