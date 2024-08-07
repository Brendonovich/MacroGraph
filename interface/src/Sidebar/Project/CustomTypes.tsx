import { Tabs } from "@kobalte/core";
import { For, createMemo, createSignal } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";

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
          <Tabs.Trigger class="flex-1 py-2" value="events">
            Events
          </Tabs.Trigger>
          <Tabs.Trigger class="flex-1 px-1 py-2" value="structs">
            Structs
          </Tabs.Trigger>
          {/* <Tabs.Trigger class="flex-1 px-1 py-2" value="enums">
						Enums
					</Tabs.Trigger> */}
          <Tabs.Indicator class="absolute inset-0 transition-transform p-1">
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
                  interfaceCtx.save();
                  return;
                }
                case "structs": {
                  interfaceCtx.execute("createCustomStruct");
                  interfaceCtx.save();
                  return;
                }
              }
            }}
          >
            <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
          </IconButton>
        </div>
        <div class="flex-1 overflow-y-auto">
          <ul class="flex flex-col divide-y divide-neutral-700 px-2">
            <Tabs.Content value="events">
              <For each={filteredEvents()}>
                {([id, event]) => (
                  <li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
                    <InlineTextEditor
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
                        class="opacity-0 focus:opacity-100 group-hover/item:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();

                          interfaceCtx.execute("createCustomEventField", {
                            eventId: id,
                          });
                          interfaceCtx.save();
                        }}
                      >
                        <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
                      </IconButton>

                      <IconButton
                        type="button"
                        class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();

                          interfaceCtx.execute("deleteCustomEvent", {
                            eventId: id,
                          });
                          interfaceCtx.save();
                        }}
                      >
                        <IconAntDesignDeleteOutlined class="size-4" />
                      </IconButton>
                    </InlineTextEditor>
                    <ul class="divide-y divide-neutral-700 flex-1 px-2 bg-black/30 rounded-md">
                      <For each={[...event.fields]}>
                        {(field) => (
                          <li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
                            <InlineTextEditor
                              value={field.name}
                              onChange={(value) => {
                                interfaceCtx.execute(
                                  "setCustomEventFieldName",
                                  {
                                    eventId: id,
                                    fieldId: field.id,
                                    name: value,
                                  },
                                );
                                interfaceCtx.save();
                              }}
                              class="-mx-1"
                            >
                              <IconButton
                                type="button"
                                class="opacity-0 focus:opacity-100 group-hover/field:opacity-100 p-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  interfaceCtx.execute(
                                    "deleteCustomEventField",
                                    { eventId: id, fieldId: field.id },
                                  );
                                  interfaceCtx.save();
                                }}
                              >
                                <IconAntDesignDeleteOutlined class="size-4" />
                              </IconButton>
                            </InlineTextEditor>

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
                                  interfaceCtx.save();
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
            <Tabs.Content value="structs">
              <For each={filteredStructs()}>
                {([id, struct]) => (
                  <li class="flex flex-col flex-1 group/item pb-2 pt-1 gap-1">
                    <InlineTextEditor
                      value={struct.name}
                      onChange={(value) => {
                        interfaceCtx.execute("setCustomStructName", {
                          structId: id,
                          name: value,
                        });
                        interfaceCtx.save();
                      }}
                    >
                      <IconButton
                        type="button"
                        class="opacity-0 focus:opacity-100 group-hover/item:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();

                          interfaceCtx.execute("createCustomStructField", {
                            structId: id,
                          });
                          interfaceCtx.save();
                        }}
                      >
                        <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
                      </IconButton>

                      <IconButton
                        type="button"
                        class="opacity-0 focus:opacity-100 group-hover/item:opacity-100 p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();

                          interfaceCtx.execute("deleteCustomStruct", {
                            structId: id,
                          });
                          interfaceCtx.save();
                        }}
                      >
                        <IconAntDesignDeleteOutlined class="size-4" />
                      </IconButton>
                    </InlineTextEditor>
                    <ul class="divide-y divide-neutral-700 flex-1 px-2 bg-black/30 rounded-md">
                      <For each={[...Object.values(struct.fields)]}>
                        {(field) => (
                          <li class="flex flex-col gap-1.5 pt-1 pb-2 group/field">
                            <InlineTextEditor
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
                                interfaceCtx.save();
                              }}
                              class="-mx-1"
                            >
                              <IconButton
                                type="button"
                                class="opacity-0 focus:opacity-100 group-hover/field:opacity-100 p-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  interfaceCtx.execute(
                                    "deleteCustomStructField",
                                    { structId: id, fieldId: field.id },
                                  );
                                  interfaceCtx.save();
                                }}
                              >
                                <IconAntDesignDeleteOutlined class="size-4" />
                              </IconButton>
                            </InlineTextEditor>

                            <div class="flex flex-row justify-start">
                              <TypeEditor
                                type={field.type}
                                onChange={(type) => {
                                  interfaceCtx.execute(
                                    "setCustomStructFieldType",
                                    { structId: id, fieldId: field.id, type },
                                  );
                                  interfaceCtx.save();
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
          </ul>
        </div>
      </Tabs.Root>
    </SidebarSection>
  );
}
