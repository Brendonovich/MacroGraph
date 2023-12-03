import {
  Accessor,
  For,
  Match,
  ParentProps,
  Setter,
  Show,
  Switch,
  createMemo,
  createSignal,
  createUniqueId,
  useContext,
} from "solid-js";
import { Graph, PrimitiveType, t } from "@macrograph/core";
import { AiOutlineCheck, AiOutlineDelete, AiOutlineEdit } from "solid-icons/ai";
import { BsX } from "solid-icons/bs";

import { useCoreContext } from "../contexts";
import { SidebarSection } from "./Sidebar";
import { SelectInput } from "./ui";
import { DropdownMenu, Popover } from "@kobalte/core";
import clsx from "clsx";
import { createContext } from "solid-js";

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

                        <TypeEditor
                          type={field.type}
                          onChange={(type) => {
                            event.editFieldType(field.id, type as any);
                          }}
                        />
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

type TypeDialogState = {
  currentType: t.Any;
  innerType: t.Any;
  onTypeSelected: (type: t.Any) => void;
};

function createContextValue() {
  const [typeDialogState, setTypeDialogState] =
    createSignal<null | TypeDialogState>(null);

  return {
    typeDialogState,
    setTypeDialogState,
    openTypeDialog(state: TypeDialogState) {
      setTypeDialogState(state);
    },
  };
}

const TypeEditorContext = createContext<ReturnType<typeof createContextValue>>(
  null!
);

function TypeEditor(props: { type: t.Any; onChange?: (type: t.Any) => void }) {
  const ctx = createContextValue();

  return (
    <TypeEditorContext.Provider value={ctx}>
      <DropdownMenu.Root
        open={ctx.typeDialogState() !== null}
        onOpenChange={() => ctx.setTypeDialogState(null)}
      >
        <DropdownMenu.Trigger
          as="div"
          class="bg-black text-left p-1 font-mono rounded border border-gray-300 flex flex-row flex-wrap"
        >
          <TypeEditorSegment
            type={props.type}
            onChange={(type) => {
              console.log(type);
              props.onChange?.(type);
            }}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class="p-2 bg-black border border-gray-300 w-52 max-h-48 flex flex-col overflow-y-auto">
            <span>Primitives</span>
            <div class="flex flex-col pl-1 text-sm">
              {PRIMITIVES.map((p) => (
                <button
                  class="text-left hover:bg-white/20 px-1 py-0.5 rounded"
                  onClick={() => {
                    ctx.typeDialogState()?.onTypeSelected(p);
                    ctx.setTypeDialogState(null);
                  }}
                >
                  {p.toString()}
                </button>
              ))}
            </div>
            <span>Arities</span>
            <div class="flex flex-col pl-1 text-sm">
              {ARITIES.map(([name, apply]) => (
                <button
                  class="text-left hover:bg-white/20 px-1 py-0.5 rounded"
                  onClick={() => {
                    ctx
                      .typeDialogState()
                      ?.onTypeSelected(
                        apply(ctx.typeDialogState()?.innerType!)
                      );
                    ctx.setTypeDialogState(null);
                  }}
                >
                  {name.toString()}
                </button>
              ))}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </TypeEditorContext.Provider>
  );
}

const PRIMITIVES = [t.string(), t.int(), t.float(), t.bool()];

const ARITIES = [
  ["Option", t.option],
  ["List", t.list],
  ["Map", t.map],
] satisfies Array<[string, (current: t.Any) => t.Any]>;

function createTypeEditorSegmentContextValue(props: { type: t.Any }) {
  const editorCtx = useContext(TypeEditorContext)!;

  const [hovered, setHovered] = createSignal(false);

  return {
    hovered: () =>
      hovered() || editorCtx.typeDialogState()?.currentType === props.type,
    setHovered,
  };
}

const TypeEditorSegmentContext = createContext<
  ReturnType<typeof createTypeEditorSegmentContextValue>
>(null!);

function TypeEditorSegment(props: {
  type: t.Any;
  onChange?: (type: t.Any) => void;
}) {
  const ctx = useContext(TypeEditorContext)!;

  const ctxValue = createTypeEditorSegmentContextValue({
    get type() {
      return props.type;
    },
  });

  const onClickFactory = (innerType: Accessor<t.Any>) => (e: MouseEvent) => {
    e.stopPropagation();

    ctx.openTypeDialog({
      currentType: props.type,
      innerType: innerType(),
      onTypeSelected: (type) => props.onChange?.(type),
    });
  };

  return (
    <TypeEditorSegmentContext.Provider value={ctxValue}>
      <Switch>
        <Match when={props.type instanceof t.Primitive && props.type}>
          {(primitiveType) => (
            <Span onClick={onClickFactory(primitiveType)}>
              {primitiveType().toString()}
            </Span>
          )}
        </Match>
        <Match when={props.type instanceof t.Option && props.type}>
          {(optionType) => (
            <>
              <Span onClick={onClickFactory(() => optionType().inner)}>
                Option{"<"}
              </Span>
              <TypeEditorSegment
                type={optionType().inner}
                onChange={(type) => props.onChange?.(t.option(type))}
              />
              <Span onClick={onClickFactory(() => optionType().inner)}>
                {">"}
              </Span>
            </>
          )}
        </Match>
        <Match when={props.type instanceof t.List && props.type}>
          {(listType) => (
            <>
              <Span onClick={onClickFactory(() => listType().item)}>
                List{"<"}
              </Span>
              <TypeEditorSegment
                type={listType().item}
                onChange={(type) => props.onChange?.(t.list(type))}
              />
              <Span onClick={onClickFactory(() => listType().item)}>{">"}</Span>
            </>
          )}
        </Match>
        <Match when={props.type instanceof t.Map && props.type}>
          {(mapType) => (
            <>
              <Span onClick={onClickFactory(() => mapType().value)}>
                Map{"<"}
              </Span>
              <TypeEditorSegment
                type={mapType().value}
                onChange={(type) => props.onChange?.(t.map(type))}
              />
              <Span onClick={onClickFactory(() => mapType().value)}>{">"}</Span>
            </>
          )}
        </Match>
      </Switch>
    </TypeEditorSegmentContext.Provider>
  );
}

function Span(
  props: ParentProps<{
    onClick?: (e: MouseEvent) => void;
  }>
) {
  const ctx = useContext(TypeEditorSegmentContext)!;

  return (
    <span
      class={clsx("cursor-pointer", ctx.hovered() && "bg-cyan-600/50")}
      onMouseEnter={() => ctx.setHovered(true)}
      onMouseLeave={() => ctx.setHovered(false)}
      onClick={(e) => props.onClick?.(e)}
    >
      {props.children}
    </span>
  );
}
