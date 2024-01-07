import { For, Match, Switch, createSignal } from "solid-js";

import { useCoreContext } from "../contexts";
import { SidebarSection } from "./Sidebar";
import { TypeEditor } from "./TypeEditor";

export const CustomEventList = () => {
  const ctx = useCoreContext();

  return (
    <SidebarSection
      title="Custom Events"
      right={
        <div class="flex flex-row items-center text-xl font-bold">
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();
              ctx.core.project.createCustomEvent();
            }}
          >
            +
          </button>
        </div>
      }
    >
      <div class="p-2 gap-2 flex flex-col">
        <For each={[...ctx.core.project.customEvents]}>
          {([id, event]) => {
            const [editingName, setEditingName] = createSignal(false);

            return (
              <div class="flex flex-col gap-2 p-2 border-neutral-400 border rounded bg-neutral-800">
                <div class="flex flex-row gap-2 justify-between items-center">
                  <Switch>
                    <Match when={editingName()}>
                      {(_) => {
                        const [value, setValue] = createSignal(event.name);

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
                                  event.name = value();
                                  setEditingName(false);
                                }}
                              >
                                <IconAntDesignCheckOutlined />
                              </button>
                              <button
                                class="w-6 h-6 relative"
                                onClick={() => setEditingName(false)}
                              >
                                <IconBiX class="absolute left-0 top-0" />
                              </button>
                            </div>
                          </>
                        );
                      }}
                    </Match>
                    <Match when={!editingName()}>
                      <span class="shrink-0">{event.name}</span>
                      <div class="gap-2 flex flex-row">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setEditingName(true);
                          }}
                        >
                          <IconAntDesignEditOutlined />
                        </button>
                        <button
                          class="px-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newPin = event.createField();
                          }}
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            ctx.core.project.customEvents.delete(id);
                            ctx.core.project.save();
                          }}
                        >
                          <IconAntDesignDeleteOutlined />
                        </button>
                      </div>
                    </Match>
                  </Switch>
                </div>

                <For each={[...event.fields]}>
                  {(field) => {
                    const [editingPinName, setEditingPinName] =
                      createSignal(false);

                    return (
                      <div class="flex flex-col gap-2 p-2 border-neutral-400 border rounded bg-neutral-800">
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
                                      class="flex-1 text-black"
                                      value={value()}
                                      onChange={(e) => setValue(e.target.value)}
                                    />
                                    <div class="flex flex-row">
                                      <button
                                        class="w-6 h-6 flex flex-row items-center justify-center"
                                        onClick={() => {
                                          event.editFieldName(
                                            field.id,
                                            value()
                                          );
                                          ctx.core.project.save();
                                          setEditingPinName(false);
                                        }}
                                      >
                                        <IconAntDesignCheckOutlined />
                                      </button>
                                      <button
                                        class="w-6 h-6 relative"
                                        onClick={() => setEditingPinName(false)}
                                      >
                                        <IconBiX class="absolute left-0 top-0" />
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
                                  <IconAntDesignEditOutlined />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    event.deletePin(field.id);
                                    ctx.core.project.save();
                                  }}
                                >
                                  <IconAntDesignDeleteOutlined />
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
                      </div>
                    );
                  }}
                </For>
              </div>
            );
          }}
        </For>
      </div>
    </SidebarSection>
  );
};
