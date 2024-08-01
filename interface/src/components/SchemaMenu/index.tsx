import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  type NodeSchema,
  type NodeSchemaVariant,
  type Pin,
  ScopeInput,
  ScopeOutput,
  type XY,
  pinIsOutput,
} from "@macrograph/runtime";
import {
  type RenderedIO,
  type RenderedSchema,
  renderSchema,
  renderType,
  renderedTypesCompatible,
} from "@macrograph/runtime-rendering";
import { createWritableMemo } from "@solid-primitives/memo";
import clsx from "clsx";
import {
  type ComponentProps,
  For,
  Show,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";

import { createEventListener } from "@solid-primitives/event-listener";
import { useInterfaceContext } from "../../context";
import type { GraphState } from "../Graph/Context";

interface Props {
  graph: GraphState;
  onSchemaClicked(
    s: NodeSchema,
    suggestion?: { pin: number }
  ): void | Promise<void>;
  onCreateCommentBox(): void;
  position: XY;
  suggestion?: { pin: Pin };
}

const TypeIndicatorColours: Record<NodeSchemaVariant, string> = {
  Base: "bg-mg-base",
  Exec: "bg-mg-exec",
  Event: "bg-mg-event",
  Pure: "bg-mg-pure",
  base: "bg-mg-base",
  exec: "bg-mg-exec",
  event: "bg-mg-event",
  pure: "bg-mg-pure",
};

const CustomHandledKeys = ["ArrowUp", "ArrowDown", "Enter", "Tab"];

export function SchemaMenu(props: Props) {
  const interfaceCtx = useInterfaceContext();

  const [search, setSearch] = createSignal("");

  const lowercaseSearchTokens = createMemo(() =>
    search()
      .toLowerCase()
      .split(" ")
      .filter((s) => s !== "")
  );

  let searchRef: HTMLInputElement;

  onMount(() => (searchRef as any).focus());

  const sortedPackages = createMemo(() =>
    interfaceCtx.core.packages.sort((a, b) => a.name.localeCompare(b.name))
  );

  const renderedSchemas = createMemo(() => {
    const p = new Map<string, Map<string, RenderedSchema>>();

    for (const pkg of interfaceCtx.core.packages) {
      const schemas = new Map<string, RenderedSchema>();

      for (const schema of pkg.schemas.values()) {
        if (!("type" in schema)) continue;
        const renderedSchema = renderSchema(schema);

        if (renderedSchema) {
          schemas.set(schema.name, renderedSchema);
        }
      }

      p.set(pkg.name, schemas);
    }

    return p;
  });

  const getItems = () => [...root!.querySelectorAll("[data-item]")];
  const getActive = (): HTMLElement | null =>
    root.querySelector('[data-active="true"]');

  function setActive(node: Element, disableScroll = false) {
    const active = getActive();
    if (active) active.removeAttribute("data-active");
    node.setAttribute("data-active", "true");
    if (!disableScroll) {
      ignorePointerEnter = true;
      node.scrollIntoView({
        block: "center",
      });
      setTimeout(() => {
        ignorePointerEnter = false;
      }, 2);
    }
  }

  function move(direction: number) {
    const items = getItems();
    const active = getActive();

    if (active) {
      const index = items.indexOf(active);
      const next = items.at((index + direction) % items.length);
      if (!next) return;
      setActive(next);
    } else {
      const last = items.at(direction < 0 ? direction : direction - 1);
      if (!last) return;
      setActive(last);
    }
  }

  let ignorePointerEnter = false;

  createEventListener(window, "keydown", (e) => {
    switch (e.code) {
      case "Tab": {
        if (e.shiftKey) move(-1);
        else move(1);

        break;
      }
      case "ArrowUp": {
        move(-1);
        break;
      }
      case "ArrowDown": {
        move(1);
        break;
      }
      case "Enter": {
        const active = getActive();
        if (!active) return;
        active.click();
        break;
      }
      case "KeyF": {
        if (!(e.ctrlKey || e.metaKey)) return;
        (searchRef as any).focus();

        break;
      }
      default:
        break;
    }

    e.preventDefault();
  });

  let root: HTMLDivElement;

  const onPointerEnter: ComponentProps<"button">["onPointerEnter"] = (e) => {
    if (ignorePointerEnter) return;
    setActive(e.target, true);
  };

  return (
    <div
      ref={root!}
      class="flex flex-col bg-neutral-900 border-black text-white border absolute z-10 w-80 h-[30rem] rounded-xl shadow-md overflow-hidden text-sm animate-in zoom-in-95 origin-top-left transition-none fade-in duration-100"
      style={{
        left: `${props.position.x - 18}px`,
        top: `${props.position.y - 18}px`,
      }}
    >
      <div class="p-2">
        <input
          ref={searchRef!}
          onInput={(e) => {
            setSearch(e.target.value);
          }}
          onKeyDown={(e) => {
            if (CustomHandledKeys.includes(e.code)) return;
            e.stopPropagation();
          }}
          onKeyUp={(e) => e.stopPropagation()}
          value={search()}
          class="h-6 w-full flex-1 bg-neutral-900 border-none rounded-sm text-xs !pl-1.5 focus-visible:outline-none focus:ring-1 focus:ring-mg-focus transition-colors"
          placeholder="Search Nodes..."
          autocomplete="false"
          autoCapitalize="off"
          autocorrect="off"
          spellcheck={false}
          tabindex={0}
        />
      </div>
      <div class="p-2 pt-0 flex-1 overflow-y-auto">
        <div class="flex flex-col">
          <Show when={search() === "" && !props.suggestion}>
            <Item
              onPointerEnter={onPointerEnter}
              // class="px-2 py-0.5 flex flex-row items-center space-x-2 hover:bg-neutral-700 min-w-full text-left rounded-md"
              onClick={props.onCreateCommentBox}
            >
              Add Comment Box
            </Item>
          </Show>
          <For each={sortedPackages()}>
            {(p) => {
              const [open, setOpen] = createWritableMemo(
                () => props.suggestion !== undefined || search() !== ""
              );

              const filteredSchemas = createMemo(() => {
                if (p.schemas.size < 1) return [];

                const lowercasePackageName = p.name.toLowerCase();

                const leftoverSearchTokens = lowercaseSearchTokens().filter(
                  (s) => !lowercasePackageName.startsWith(s)
                );

                const ret: {
                  schema: NodeSchema;
                  suggestion?: { pin: number };
                }[] = [];

                for (const schema of p.schemas.values()) {
                  const lowercaseSchemaName = schema.name.toLowerCase();

                  const searchMatches = leftoverSearchTokens.every((t) =>
                    lowercaseSchemaName.includes(t)
                  );

                  if (searchMatches) {
                    if (props.suggestion) {
                      const renderedSchema = renderedSchemas()
                        .get(p.name)
                        ?.get(schema.name);
                      if (!renderedSchema) continue;

                      if ("type" in schema) {
                        const { pin } = props.suggestion;

                        if (pinIsOutput(pin)) {
                          if (pin instanceof ExecOutput) {
                            const index = renderedSchema.inputs.findIndex(
                              (i) => i.variant === "exec"
                            );
                            if (index !== -1)
                              ret.push({ schema, suggestion: { pin: index } });
                          } else if (pin instanceof DataOutput) {
                            const renderedType = renderType(pin.type);
                            if (!renderedType) continue;

                            const index = renderedSchema.inputs.findIndex(
                              (i) => i.variant === "data"
                            );
                            const input = renderedSchema.inputs[index] as
                              | Extract<RenderedIO, { variant: "data" }>
                              | undefined;

                            if (
                              input &&
                              (renderedType === "wildcard" ||
                                input.type === "wildcard" ||
                                renderedTypesCompatible(
                                  input.type,
                                  renderedType
                                ))
                            )
                              ret.push({ schema, suggestion: { pin: index } });
                          } else if (pin instanceof ScopeOutput) {
                            const index = renderedSchema.inputs.findIndex(
                              (i) => i.variant === "scope"
                            );
                            if (index !== -1)
                              ret.push({ schema, suggestion: { pin: index } });
                          }
                        } else {
                          if (pin instanceof ExecInput) {
                            const index = renderedSchema.outputs.findIndex(
                              (i) => i.variant === "exec"
                            );
                            if (index !== -1)
                              ret.push({ schema, suggestion: { pin: index } });
                          } else if (pin instanceof DataInput) {
                            const renderedType = renderType(pin.type);
                            if (!renderedType) continue;

                            const index = renderedSchema.outputs.findIndex(
                              (o) => o.variant === "data"
                            );
                            const output = renderedSchema.outputs[index] as
                              | Extract<RenderedIO, { variant: "data" }>
                              | undefined;
                            if (
                              output &&
                              (renderedType === "wildcard" ||
                                output.type === "wildcard" ||
                                renderedTypesCompatible(
                                  output.type,
                                  renderedType
                                ))
                            )
                              ret.push({ schema, suggestion: { pin: index } });
                          } else if (pin instanceof ScopeInput) {
                            const index = renderedSchema.outputs.findIndex(
                              (i) => i.variant === "scope"
                            );
                            if (index !== -1)
                              ret.push({ schema, suggestion: { pin: index } });
                          }
                        }
                      }
                    } else ret.push({ schema });
                  }
                }

                return ret;
              });

              return (
                <Show when={filteredSchemas().length !== 0}>
                  <Item
                    onPointerEnter={onPointerEnter}
                    // class="px-1 py-0.5 flex flex-row items-center space-x-1 hover:bg-neutral-700 min-w-full text-left rounded-md"
                    onClick={() => setOpen(!open())}
                  >
                    <IconMaterialSymbolsArrowRightRounded
                      class="size-4 scale-125 transform transition-transform"
                      classList={{ "rotate-90": open() }}
                    />
                    <span>{p.name}</span>
                  </Item>
                  <Show when={open()}>
                    <For each={filteredSchemas()}>
                      {({ schema, suggestion }) => (
                        <Item
                          class="ml-4"
                          onPointerEnter={onPointerEnter}
                          // class="ml-4 px-2 py-0.5 flex flex-row items-center space-x-2 whitespace-nowrap min-w-full text-left hover:bg-neutral-700 rounded-lg"
                          onClick={() =>
                            props.onSchemaClicked(schema, suggestion)
                          }
                        >
                          <div
                            class={clsx(
                              "h-3 w-3 rounded-full",
                              TypeIndicatorColours[
                                "variant" in schema
                                  ? schema.variant
                                  : "type" in schema
                                  ? schema.type
                                  : "Event"
                              ]
                            )}
                          />
                          <span>{schema.name}</span>
                        </Item>
                      )}
                    </For>
                  </Show>
                </Show>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}

function Item(props: Omit<ComponentProps<"button">, "type">) {
  return (
    <button
      {...props}
      data-item
      type="button"
      class={clsx(
        "px-2 py-0.5 flex flex-row items-center space-x-2 data-[active=true]:bg-neutral-700 flex-1 text-left rounded-md focus:outline-none",
        props.class
      )}
    />
  );
}
