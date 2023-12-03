import {
  Accessor,
  For,
  Match,
  ParentProps,
  Switch,
  children,
  createSignal,
  useContext,
} from "solid-js";
import { t } from "@macrograph/core";
import { AiOutlineCheck, AiOutlineDelete, AiOutlineEdit } from "solid-icons/ai";
import { BsX } from "solid-icons/bs";

import { useCoreContext } from "../contexts";
import { SidebarSection } from "./Sidebar";
import { DropdownMenu } from "@kobalte/core";
import clsx from "clsx";
import { createContext } from "solid-js";

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

type TypeDialogState = {
  currentType: t.Any;
  innerType: t.Any;
  onTypeSelected: (type: t.Any) => void;
};

function createContextValue() {
  const [typeDialogState, setTypeDialogState] =
    createSignal<null | TypeDialogState>(null);

  const [hoveredType, setHoveredType] = createSignal<t.Any | null>(null);

  return {
    typeDialogState,
    setTypeDialogState,
    hoveredType,
    setHoveredType,
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
          class="p-1 overflow-x-auto overflow-y-hidden no-scrollbar font-mono flex flex-row"
        >
          <TypeEditorSegment
            type={props.type}
            onChange={(type) => props.onChange?.(type)}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class="p-2 bg-black border border-gray-300 w-52 max-h-48 flex flex-col overflow-y-auto text-white">
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

function createTypeEditorSegmentContextValue(props: { type: Accessor<t.Any> }) {
  const editorCtx = useContext(TypeEditorContext)!;

  return {
    type: props.type,
    hovered: () =>
      editorCtx.typeDialogState()?.currentType === props.type() ||
      editorCtx.hoveredType() === props.type(),
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
    type: () => props.type,
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
              <PaddedSpan>{primitiveType().toString()}</PaddedSpan>
            </Span>
          )}
        </Match>
        <Match when={props.type instanceof t.Option && props.type}>
          {(optionType) => {
            const onClick = onClickFactory(() => optionType().inner);

            return (
              <Span onClick={onClick}>
                <PaddedSpan>Option</PaddedSpan>
                <TypeEditorSegment
                  type={optionType().inner}
                  onChange={(type) => props.onChange?.(t.option(type))}
                />
              </Span>
            );
          }}
        </Match>
        <Match when={props.type instanceof t.List && props.type}>
          {(listType) => {
            const onClick = onClickFactory(() => listType().item);

            return (
              <Span onClick={onClick}>
                <PaddedSpan>List</PaddedSpan>
                <TypeEditorSegment
                  type={listType().item}
                  onChange={(type) => props.onChange?.(t.list(type))}
                />
              </Span>
            );
          }}
        </Match>
        <Match when={props.type instanceof t.Map && props.type}>
          {(mapType) => {
            const onClick = onClickFactory(() => mapType().value);

            return (
              <Span onClick={onClick}>
                <PaddedSpan>Map</PaddedSpan>
                <TypeEditorSegment
                  type={mapType().value}
                  onChange={(type) => props.onChange?.(t.map(type))}
                />
              </Span>
            );
          }}
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
  const editorCtx = useContext(TypeEditorContext)!;
  const ctx = useContext(TypeEditorSegmentContext)!;

  const resolved = children(() => props.children);

  return (
    <div
      class={clsx(
        "cursor-pointer border border-white/50 rounded-lg bg-black flex flex-row flex-nowrap shrink-0 -my-px",
        ctx.hovered() && "bg-cyan-600/50",
        resolved.toArray().length > 1 && "pr-2"
      )}
      onMouseMove={(e) => {
        e.stopPropagation();

        editorCtx.setHoveredType(ctx.type);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();

        editorCtx.setHoveredType(null);
      }}
      onClick={(e) => props.onClick?.(e)}
    >
      {props.children}
    </div>
  );
}

function PaddedSpan(props: ParentProps) {
  return <span class="p-1">{props.children}</span>;
}
