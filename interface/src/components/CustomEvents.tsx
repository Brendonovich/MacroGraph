import { For, Match, Switch, createSignal } from "solid-js";
import { Graph, PrimitiveType, t } from "@macrograph/core";
import { CgImport } from "solid-icons/cg";

import { useCore, useCoreContext } from "../contexts";
import { useUIStore } from "../UIStore";
import { SidebarSection } from "./Sidebar";
import { deserializeClipboardItem, readFromClipboard } from "../clipboard";
import { GraphItem } from "./ProjectSidebar/GraphItem";
import { AiOutlineCheck, AiOutlineDelete, AiOutlineEdit } from "solid-icons/ai";
import { BsX } from "solid-icons/bs";
import { SelectInput, CheckBox, TextInput, IntInput, FloatInput } from "./ui";

// React component to show a list of projects
interface Props {
  currentGraph?: number;
  onGraphClicked(graph: Graph): void;
}

export const CustomEventList = (props: Props) => {
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
                                <AiOutlineCheck />
                              </button>
                              <button
                                class="w-6 h-6 relative"
                                onClick={() => setEditingName(false)}
                              >
                                <BsX size={24} class="absolute left-0 top-0" />
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
                          <AiOutlineEdit />
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
                          <AiOutlineDelete />
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
                                        <AiOutlineCheck />
                                      </button>
                                      <button
                                        class="w-6 h-6 relative"
                                        onClick={() => setEditingPinName(false)}
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
                            <Match when={!editingPinName()}>
                              <span class="shrink-0">{field.name}</span>
                              <div class="gap-2 flex flex-row">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setEditingPinName(true);
                                  }}
                                >
                                  <AiOutlineEdit />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    event.deletePin(field.id);
                                    ctx.core.project.save();
                                  }}
                                >
                                  <AiOutlineDelete />
                                </button>
                              </div>
                            </Match>
                          </Switch>
                        </div>

                        <div class="flex flex-row items-center gap-2 text-sm">
                          <span>Type</span>
                          <SelectInput<PrimitiveType>
                            options={[t.string(), t.int(), t.float(), t.bool()]}
                            optionValue={(o) => o.primitiveVariant()}
                            optionTextValue={(o) => o.toString()}
                            value={field.type}
                            getLabel={(v) => v.toString()}
                            onChange={(v) => {
                              if (field.type.eq(v)) return;

                              field.type = v;
                              event.editFieldType(id, v);
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
