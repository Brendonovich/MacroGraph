import { Tabs } from "@kobalte/core";
import { For, Show, ValidComponent, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor, InlineTextEditorContext } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";
import { ContextMenu } from "@kobalte/core/context-menu";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRenameItem,
} from "../../components/Graph/ContextMenu";

export function CustomTypes() {
  const [search, setSearch] = createSignal("");
  const interfaceCtx = useInterfaceContext();

  const tokenisedEvents = createMemo(() =>
    [...interfaceCtx.core.project.customEvents].map(
      ([id, event]) => [tokeniseString(event.name), [id, event]] as const,
    ),
  );

  const filteredEvents = createTokenisedSearchFilter(search, tokenisedEvents);

  const tokenisedStructs = createMemo(() =>
    [...interfaceCtx.core.project.customStructs].map(
      ([id, struct]) => [tokeniseString(struct.name), [id, struct]] as const,
    ),
  );

  const filteredStructs = createTokenisedSearchFilter(search, tokenisedStructs);

  const tokenisedEnums = createMemo(() =>
    [...interfaceCtx.core.project.customEnums].map(
      ([id, enm]) => [tokeniseString(enm.name), [id, enm]] as const,
    ),
  );

  const filteredEnums = createTokenisedSearchFilter(search, tokenisedEnums);

  const [selected, setSelected] = createSignal<"events" | "structs" | "enums">(
    "events",
  );

  return (
    <SidebarSection title="Custom Types">
      <Tabs.Root
        class="overflow-y-hidden flex flex-col"
        value={selected()}
        onChange={(v) => {
          setSelected(v as any);
          setSearch("");
        }}
      >
        <Tabs.List class="flex flex-row relative overflow-hidden bg-neutral-800 text-xs">
          <Tabs.Trigger class="flex-1 px-1 py-2" value="events">
            Events
          </Tabs.Trigger>
          <Tabs.Trigger class="flex-1 px-1 py-2" value="structs">
            Structs
          </Tabs.Trigger>
          <Tabs.Trigger class="flex-1 px-1 py-2" value="enums">
            Enums
          </Tabs.Trigger>
          <Tabs.Indicator class="absolute inset-0 data-[resizing='false']:transition-transform p-1">
            <div class="bg-white/20 w-full h-full rounded" />
          </Tabs.Indicator>
        </Tabs.List>
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
              switch (selected()) {
                case "events": {
                  interfaceCtx.execute("createCustomEvent");
                  return;
                }
                case "structs": {
                  interfaceCtx.execute("createCustomStruct");
                  return;
                }
                case "enums": {
                  interfaceCtx.execute("createCustomEnum");
                  return;
                }
              }
            }}
          >
            <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
          </IconButton>
        </div>
        <div class="flex-1 overflow-y-auto">
          <Tabs.Content
            as="ul"
            class="flex flex-col divide-y divide-neutral-700 px-2"
            value="events"
          >
            <For each={filteredEvents()}>
              {([id, event]) => (
                <li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
                  <InlineTextEditor
                    class="-mx-1"
                    value={event.name}
                    onChange={(value) => {
                      interfaceCtx.execute("setCustomEventName", {
                        eventId: id,
                        name: value,
                      });
                    }}
                  >
                    <IconButton
                      type="button"
                      class="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();

                        interfaceCtx.execute("createCustomEventField", {
                          eventId: id,
                        });
                      }}
                    >
                      <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
                    </IconButton>

                    <IconButton
                      type="button"
                      class="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100 p-0.5 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();

                        interfaceCtx.execute("deleteCustomEvent", {
                          eventId: id,
                        });
                      }}
                    >
                      <IconAntDesignDeleteOutlined class="size-4" />
                    </IconButton>
                  </InlineTextEditor>
                  <ul class="divide-y divide-neutral-700 flex-1 px-2 bg-black/30 rounded-md">
                    <For each={event.fields}>
                      {(field, i) => (
                        <li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
                          <InlineTextEditorContext>
                            <ContextMenu placement="bottom-start">
                              <InlineTextEditor<ValidComponent>
                                as={(asProps) => (
                                  <ContextMenu.Trigger<"span">
                                    {...asProps}
                                    as="span"
                                  />
                                )}
                                class="-mx-1"
                                value={field.name ?? field.id}
                                onChange={(value) => {
                                  interfaceCtx.execute(
                                    "setCustomEventFieldName",
                                    {
                                      eventId: id,
                                      fieldId: field.id,
                                      name: value,
                                    },
                                  );
                                }}
                              >
                                <IconButton
                                  type="button"
                                  class="opacity-0 focus-visible:opacity-100 group-hover/field:opacity-100 p-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    interfaceCtx.execute(
                                      "deleteCustomEventField",
                                      {
                                        eventId: id,
                                        fieldId: field.id,
                                      },
                                    );
                                  }}
                                >
                                  <IconAntDesignDeleteOutlined class="size-4" />
                                </IconButton>
                              </InlineTextEditor>
                              <ContextMenuContent>
                                <ContextMenuRenameItem />
                                <Show when={i() !== 0}>
                                  <ContextMenuItem
                                    onSelect={() =>
                                      interfaceCtx.execute(
                                        "moveCustomEventFieldToIndex",
                                        {
                                          eventId: event.id,
                                          fieldId: field.id,
                                          currentIndex: i(),
                                          newIndex: i() - 1,
                                        },
                                      )
                                    }
                                  >
                                    <IconMaterialSymbolsArrowDropUpRounded class="transform scale-150" />
                                    Move Up
                                  </ContextMenuItem>
                                </Show>
                                <Show when={i() !== event.fields.length - 1}>
                                  <ContextMenuItem
                                    onSelect={() =>
                                      interfaceCtx.execute(
                                        "moveCustomEventFieldToIndex",
                                        {
                                          eventId: event.id,
                                          fieldId: field.id,
                                          currentIndex: i(),
                                          newIndex: i() + 1,
                                        },
                                      )
                                    }
                                  >
                                    <IconMaterialSymbolsArrowDropDownRounded class="transform scale-150" />
                                    Move Down
                                  </ContextMenuItem>
                                </Show>
                              </ContextMenuContent>
                            </ContextMenu>
                          </InlineTextEditorContext>
                          <div class="flex flex-row justify-start">
                            <TypeEditor
                              type={field.type}
                              onChange={(type) => {
                                interfaceCtx.execute(
                                  "setCustomEventFieldType",
                                  {
                                    eventId: id,
                                    fieldId: field.id,
                                    type: type as any,
                                  },
                                );
                              }}
                            />
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </li>
              )}
            </For>
          </Tabs.Content>
          <Tabs.Content
            as="ul"
            class="flex flex-col divide-y divide-neutral-700 px-2"
            value="structs"
          >
            <For each={filteredStructs()}>
              {([id, struct]) => (
                <li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
                  <InlineTextEditor
                    class="-mx-1"
                    value={struct.name}
                    onChange={(value) => {
                      interfaceCtx.execute("setCustomStructName", {
                        structId: id,
                        name: value,
                      });
                    }}
                  >
                    <IconButton
                      type="button"
                      class="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();

                        interfaceCtx.execute("createCustomStructField", {
                          structId: id,
                        });
                      }}
                    >
                      <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
                    </IconButton>

                    <IconButton
                      type="button"
                      class="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100 p-0.5 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();

                        interfaceCtx.execute("deleteCustomStruct", {
                          structId: id,
                        });
                      }}
                    >
                      <IconAntDesignDeleteOutlined class="size-4" />
                    </IconButton>
                  </InlineTextEditor>
                  <ul class="divide-y divide-neutral-700 flex-1 px-2 bg-black/30 rounded-md">
                    <For
                      each={struct.fieldOrder
                        .map((id) => struct.fields[id])
                        .filter(Boolean)}
                    >
                      {(field, i) => (
                        <li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
                          <InlineTextEditorContext>
                            <ContextMenu placement="bottom-start">
                              <InlineTextEditor<ValidComponent>
                                as={(asProps) => (
                                  <ContextMenu.Trigger<"span">
                                    {...asProps}
                                    as="span"
                                  />
                                )}
                                class="-mx-1"
                                value={field.name ?? field.id}
                                onChange={(value) => {
                                  interfaceCtx.execute(
                                    "setCustomStructFieldName",
                                    {
                                      structId: id,
                                      fieldId: field.id,
                                      name: value,
                                    },
                                  );
                                }}
                              >
                                <IconButton
                                  type="button"
                                  class="opacity-0 focus-visible:opacity-100 group-hover/field:opacity-100 p-0.5 mr-1"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    interfaceCtx.execute(
                                      "deleteCustomStructField",
                                      { structId: id, fieldId: field.id },
                                    );
                                  }}
                                >
                                  <IconAntDesignDeleteOutlined class="size-4" />
                                </IconButton>
                              </InlineTextEditor>
                              <ContextMenuContent>
                                <ContextMenuRenameItem />
                                <Show when={i() !== 0}>
                                  <ContextMenuItem
                                    onSelect={() =>
                                      interfaceCtx.execute(
                                        "moveCustomStructFieldToIndex",
                                        {
                                          structId: struct.id,
                                          fieldId: field.id,
                                          currentIndex: i(),
                                          newIndex: i() - 1,
                                        },
                                      )
                                    }
                                  >
                                    <IconMaterialSymbolsArrowDropUpRounded class="transform scale-150" />
                                    Move Up
                                  </ContextMenuItem>
                                </Show>
                                <Show
                                  when={i() !== struct.fieldOrder.length - 1}
                                >
                                  <ContextMenuItem
                                    onSelect={() =>
                                      interfaceCtx.execute(
                                        "moveCustomStructFieldToIndex",
                                        {
                                          structId: struct.id,
                                          fieldId: field.id,
                                          currentIndex: i(),
                                          newIndex: i() + 1,
                                        },
                                      )
                                    }
                                  >
                                    <IconMaterialSymbolsArrowDropDownRounded class="transform scale-150" />
                                    Move Down
                                  </ContextMenuItem>
                                </Show>
                              </ContextMenuContent>
                            </ContextMenu>
                          </InlineTextEditorContext>

                          <div class="flex flex-row justify-start">
                            <TypeEditor
                              type={field.type}
                              onChange={(type) => {
                                interfaceCtx.execute(
                                  "setCustomStructFieldType",
                                  { structId: id, fieldId: field.id, type },
                                );
                              }}
                            />
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </li>
              )}
            </For>
          </Tabs.Content>
          <Tabs.Content
            as="ul"
            class="flex flex-col divide-y divide-neutral-700 px-2"
            value="enums"
          >
            <For each={filteredEnums()}>
              {([id, enm]) => (
                <li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
                  <InlineTextEditor
                    class="-mx-1"
                    value={enm.name}
                    onChange={(value) => {
                      interfaceCtx.execute("setCustomEnumName", {
                        enumId: id,
                        name: value,
                      });
                    }}
                  >
                    <IconButton
                      type="button"
                      class="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();

                        interfaceCtx.execute("createCustomEnumVariant", {
                          enumId: id,
                        });
                      }}
                    >
                      <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
                    </IconButton>

                    <IconButton
                      type="button"
                      class="opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100 p-0.5 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();

                        interfaceCtx.execute("deleteCustomEnum", {
                          enumId: id,
                        });
                      }}
                    >
                      <IconAntDesignDeleteOutlined class="size-4" />
                    </IconButton>
                  </InlineTextEditor>
                  <Show when={enm.variants.length}>
                    <ul class="px-2 bg-black/30 rounded-md divide-y divide-white/10">
                      <For each={enm.variants}>
                        {(variant, i) => (
                          <li class="flex flex-col flex-1 group/variant pb-1 pt-1 gap-1">
                            <InlineTextEditorContext>
                              <ContextMenu placement="bottom-start">
                                <InlineTextEditor<ValidComponent>
                                  as={(asProps) => (
                                    <ContextMenu.Trigger<"span">
                                      {...asProps}
                                      as="span"
                                    />
                                  )}
                                  class="-mx-1"
                                  value={variant.name ?? variant.id}
                                  onChange={(value) => {
                                    interfaceCtx.execute(
                                      "setCustomEnumVariantName",
                                      {
                                        enumId: id,
                                        variantId: variant.id,
                                        name: value,
                                      },
                                    );
                                  }}
                                >
                                  <IconButton
                                    type="button"
                                    class="opacity-0 focus-visible:opacity-100 group-hover/variant:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      interfaceCtx.execute(
                                        "createCustomEnumVariantField",
                                        { enumId: id, variantId: variant.id },
                                      );
                                    }}
                                  >
                                    <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
                                  </IconButton>

                                  <IconButton
                                    type="button"
                                    class="opacity-0 focus-visible:opacity-100 group-hover/variant:opacity-100 p-0.5 mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      interfaceCtx.execute(
                                        "deleteCustomEnumVariant",
                                        { enumId: id, variantId: variant.id },
                                      );
                                    }}
                                  >
                                    <IconAntDesignDeleteOutlined class="size-4" />
                                  </IconButton>
                                </InlineTextEditor>
                                <ContextMenuContent>
                                  <ContextMenuRenameItem />
                                  <Show when={i() !== 0}>
                                    <ContextMenuItem
                                      onSelect={() =>
                                        interfaceCtx.execute(
                                          "moveCustomEnumVariantToIndex",
                                          {
                                            enumId: enm.id,
                                            variantId: variant.id,
                                            currentIndex: i(),
                                            newIndex: i() - 1,
                                          },
                                        )
                                      }
                                    >
                                      <IconMaterialSymbolsArrowDropUpRounded class="transform scale-150" />
                                      Move Up
                                    </ContextMenuItem>
                                  </Show>
                                  <Show when={i() !== enm.variants.length - 1}>
                                    <ContextMenuItem
                                      onSelect={() =>
                                        interfaceCtx.execute(
                                          "moveCustomEnumVariantToIndex",
                                          {
                                            enumId: enm.id,
                                            variantId: variant.id,
                                            currentIndex: i(),
                                            newIndex: i() + 1,
                                          },
                                        )
                                      }
                                    >
                                      <IconMaterialSymbolsArrowDropDownRounded class="transform scale-150" />
                                      Move Down
                                    </ContextMenuItem>
                                  </Show>
                                </ContextMenuContent>
                              </ContextMenu>
                            </InlineTextEditorContext>

                            <Show when={variant.fieldOrder.length > 0}>
                              <ul class="divide-y divide-white/10 flex-1 px-2 bg-black/30 rounded-md mb-1">
                                <For
                                  each={variant.fieldOrder
                                    .map((id) => variant.fields[id])
                                    .filter(Boolean)}
                                >
                                  {(field, i) => (
                                    <li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
                                      <InlineTextEditorContext>
                                        <ContextMenu placement="bottom-start">
                                          <InlineTextEditor<ValidComponent>
                                            as={(asProps) => (
                                              <ContextMenu.Trigger<"span">
                                                {...asProps}
                                                as="span"
                                              />
                                            )}
                                            value={field.name ?? field.id}
                                            onChange={(value) => {
                                              interfaceCtx.execute(
                                                "setCustomEnumVariantFieldName",
                                                {
                                                  enumId: enm.id,
                                                  variantId: variant.id,
                                                  fieldId: field.id,
                                                  name: value,
                                                },
                                              );
                                            }}
                                            class="-mx-1"
                                          >
                                            <IconButton
                                              type="button"
                                              class="opacity-0 focus-visible:opacity-100 group-hover/field:opacity-100 p-0.5 mr-0.5"
                                              onClick={(e) => {
                                                e.stopPropagation();

                                                interfaceCtx.execute(
                                                  "deleteCustomEnumVariantField",
                                                  {
                                                    enumId: enm.id,
                                                    variantId: variant.id,
                                                    fieldId: field.id,
                                                  },
                                                );
                                              }}
                                            >
                                              <IconAntDesignDeleteOutlined class="size-4" />
                                            </IconButton>
                                          </InlineTextEditor>
                                          <ContextMenuContent>
                                            <ContextMenuRenameItem />
                                            <Show when={i() !== 0}>
                                              <ContextMenuItem
                                                onSelect={() =>
                                                  interfaceCtx.execute(
                                                    "moveCustomEnumVariantFieldToIndex",
                                                    {
                                                      enumId: enm.id,
                                                      variantId: variant.id,
                                                      fieldId: field.id,
                                                      currentIndex: i(),
                                                      newIndex: i() - 1,
                                                    },
                                                  )
                                                }
                                              >
                                                <IconMaterialSymbolsArrowDropUpRounded class="transform scale-150" />
                                                Move Up
                                              </ContextMenuItem>
                                            </Show>
                                            <Show
                                              when={
                                                i() !==
                                                variant.fieldOrder.length - 1
                                              }
                                            >
                                              <ContextMenuItem
                                                onSelect={() =>
                                                  interfaceCtx.execute(
                                                    "moveCustomEnumVariantFieldToIndex",
                                                    {
                                                      enumId: enm.id,
                                                      variantId: variant.id,
                                                      fieldId: field.id,
                                                      currentIndex: i(),
                                                      newIndex: i() + 1,
                                                    },
                                                  )
                                                }
                                              >
                                                <IconMaterialSymbolsArrowDropDownRounded class="transform scale-150" />
                                                Move Down
                                              </ContextMenuItem>
                                            </Show>
                                          </ContextMenuContent>
                                        </ContextMenu>
                                      </InlineTextEditorContext>

                                      <div class="flex flex-row justify-start">
                                        <TypeEditor
                                          type={field.type}
                                          onChange={(type) => {
                                            interfaceCtx.execute(
                                              "setCustomEnumVariantFieldType",
                                              {
                                                enumId: enm.id,
                                                variantId: variant.id,
                                                fieldId: field.id,
                                                type,
                                              },
                                            );
                                          }}
                                        />
                                      </div>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </Show>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </li>
              )}
            </For>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </SidebarSection>
  );
}
