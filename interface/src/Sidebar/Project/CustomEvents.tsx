import { For, Match, Show, Switch, createSignal } from "solid-js";
import { Card } from "@macrograph/ui";
import { useCoreContext } from "../../contexts";
import { SidebarSection } from "../../components/Sidebar";
import { TypeEditor } from "../../components/TypeEditor";

export function CustomEvents() {
  const ctx = useCoreContext();

  return (
    <SidebarSection
      title="Custom Events"
      right={
        <button
          onClick={(e) => {
            e.stopPropagation();
            ctx.core.project.createCustomEvent();
          }}
        >
          <IconMaterialSymbolsAddRounded class="w-6 h-6" />
        </button>
      }
    >
      <ul class="p-2 space-y-2">
        <For each={[...ctx.core.project.customEvents]}>
          {([id, event]) => {
            const [editingName, setEditingName] = createSignal(false);
            const [fieldsHidden, setFieldsHidden] = createSignal(false);

            return (
              <Card class="divide-y divide-black">
                <div class="p-2 flex flex-row gap-2 justify-between items-center">
                  <button onClick={() => setFieldsHidden((h) => !h)}>
                    <IconFa6SolidChevronRight
                      class="w-3 h-3"
                      classList={{ "rotate-90": !fieldsHidden() }}
                    />
                  </button>
                  <Switch>
                    <Match when={editingName()}>
                      {(_) => {
                        const [value, setValue] = createSignal(event.name);

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
                                  event.name = value();
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
                      <span class="shrink-0">{event.name}</span>
                      <div class="flex-1 gap-2 flex flex-row justify-end">
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
                            event.createField();
                          }}
                        >
                          <IconMaterialSymbolsAddRounded class="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            ctx.core.project.customEvents.delete(id);
                            ctx.core.project.save();
                          }}
                        >
                          <IconAntDesignDeleteOutlined class="w-4 h-4" />
                        </button>
                      </div>
                    </Match>
                  </Switch>
                </div>

                <Show when={!fieldsHidden()}>
                  <ul class="divide-y divide-black">
                    <For each={[...event.fields]}>
                      {(field) => {
                        const [editingPinName, setEditingPinName] =
                          createSignal(false);

                        return (
                          <li class="flex flex-col gap-2 p-2">
                            <div class="flex flex-row gap-2 justify-between items-center">
                              <Switch>
                                <Match when={editingPinName()}>
                                  {(_) => {
                                    const [value, setValue] = createSignal(
                                      field.name
                                    );

                                    return (
                                      <>
                                        <input
                                          class="flex-1 text-black  -ml-1 pl-1"
                                          value={value()}
                                          onChange={(e) =>
                                            setValue(e.target.value)
                                          }
                                        />
                                        <div class="flex flex-row space-x-1">
                                          <button
                                            onClick={() => {
                                              event.editFieldName(
                                                field.id,
                                                value()
                                              );
                                              ctx.core.project.save();
                                              setEditingPinName(false);
                                            }}
                                          >
                                            <IconAntDesignCheckOutlined class="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditingPinName(false)
                                            }
                                          >
                                            <IconAntDesignCloseOutlined class="w-4 h-4" />
                                          </button>
                                        </div>
                                      </>
                                    );
                                  }}
                                </Match>
                                <Match when={!editingPinName()}>
                                  <span class="shrink-0">{field.name}</span>
                                  <div class="gap-2 flex flex-row">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        setEditingPinName(true);
                                      }}
                                    >
                                      <IconAntDesignEditOutlined class="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        event.deletePin(field.id);
                                        ctx.core.project.save();
                                      }}
                                    >
                                      <IconAntDesignDeleteOutlined class="w-4 h-4" />
                                    </button>
                                  </div>
                                </Match>
                              </Switch>
                            </div>

                            <div class="flex flex-row justify-start">
                              <TypeEditor
                                type={field.type}
                                onChange={(type) => {
                                  event.editFieldType(field.id, type as any);
                                }}
                              />
                            </div>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </Show>
              </Card>
            );
          }}
        </For>
      </ul>
    </SidebarSection>
  );
}
