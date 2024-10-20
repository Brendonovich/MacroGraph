import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  type Graph,
  type NodeSchema,
  type NodeSchemaVariant,
  type Pin,
  ScopeInput,
  ScopeOutput,
  type XY,
  pinIsOutput,
} from "@macrograph/runtime";
import {
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
  // graph: GraphState;
  graphModel: Graph;
  onSchemaClicked(
    s: NodeSchema,
    suggestion?: { pin: string },
    extra?: { name?: string; defaultProperties?: Record<string, any> },
  ): void | Promise<void>;
  onCreateCommentBox(): void;
  onPasteClipboard(): void;
  position: XY;
  suggestion?: { pin: Pin };
  onClose?(): void;
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

export function SchemaMenu(props: Props) {
  const interfaceCtx = useInterfaceContext();

  const [search, setSearch] = createSignal("");

  const lowercaseSearchTokens = createMemo(() =>
    search()
      .toLowerCase()
      .split(" ")
      .filter((s) => s !== ""),
  );

  let searchRef: HTMLInputElement;

  onMount(() => (searchRef as any).focus());

  const sortedPackages = createMemo(() =>
    interfaceCtx.core.packages.sort((a, b) => a.name.localeCompare(b.name)),
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
      node.scrollIntoView({ block: "center" });
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
      const next = at(items, (index + direction) % items.length);
      if (!next) return;
      setActive(next);
    } else {
      const last = at(items, direction < 0 ? direction : direction - 1);
      if (!last) return;
      setActive(last);
    }
  }

  let ignorePointerEnter = false;

  function handleKeyDown(e: KeyboardEvent) {
    e.stopPropagation();

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
      case "Escape": {
        if (props.onClose) props.onClose();
        break;
      }
      default:
        return;
    }

    e.preventDefault();
  }

  createEventListener(window, "keydown", handleKeyDown);

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
          onKeyDown={handleKeyDown}
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
              onClick={props.onCreateCommentBox}
            >
              Add Comment Box
            </Item>
            {/*<Item
              onPointerEnter={onPointerEnter}
              onClick={props.onPasteClipboard}
            >
              Paste from Clipboard
            </Item>*/}
          </Show>
          <For each={sortedPackages()}>
            {(p) => {
              const [open, setOpen] = createWritableMemo(
                () => props.suggestion !== undefined || search() !== "",
              );

              const filteredSchemas = createMemo(() => {
                if (p.schemas.size < 1) return [];

                const lowercasePackageName = p.name.toLowerCase();

                const leftoverSearchTokens = lowercaseSearchTokens().filter(
                  (s) => !lowercasePackageName.startsWith(s),
                );

                const ret: {
                  schema: NodeSchema;
                  suggestion?: { pin: string };
                  name?: string;
                  defaultProperties?: Record<string, any>;
                }[] = [];

                for (const schema of p.schemas.values()) {
                  const lowercaseSchemaName = schema.name.toLowerCase();

                  const searchMatches = leftoverSearchTokens.every((t) =>
                    lowercaseSchemaName.includes(t),
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
                            const io = renderedSchema.inputs.find(
                              (i) => i.variant === "exec",
                            );
                            if (io)
                              ret.push({ schema, suggestion: { pin: io.id } });
                          } else if (pin instanceof DataOutput) {
                            const renderedType = renderType(pin.type);
                            if (!renderedType) continue;

                            const io = renderedSchema.inputs.find(
                              (i) => i.variant === "data",
                            );

                            if (
                              io &&
                              renderedTypesCompatible(io.type, renderedType)
                            )
                              ret.push({ schema, suggestion: { pin: io.id } });
                          } else if (pin instanceof ScopeOutput) {
                            const io = renderedSchema.inputs.find(
                              (i) => i.variant === "scope",
                            );
                            if (io)
                              ret.push({ schema, suggestion: { pin: io.id } });
                          }
                        } else {
                          if (pin instanceof ExecInput) {
                            const io = renderedSchema.outputs.find(
                              (i) => i.variant === "exec",
                            );
                            if (io)
                              ret.push({ schema, suggestion: { pin: io.id } });
                          } else if (pin instanceof DataInput) {
                            const renderedType = renderType(pin.type);
                            if (!renderedType) continue;

                            const io = renderedSchema.outputs.find(
                              (o) => o.variant === "data",
                            );
                            if (
                              io &&
                              renderedTypesCompatible(io.type, renderedType)
                            )
                              ret.push({ schema, suggestion: { pin: io.id } });
                          } else if (pin instanceof ScopeInput) {
                            const io = renderedSchema.outputs.find(
                              (i) => i.variant === "scope",
                            );
                            if (io)
                              ret.push({ schema, suggestion: { pin: io.id } });
                          }
                        }
                      }
                    } else ret.push({ schema });
                  }
                }

                if (p.name === "Custom Events") {
                  const emitCustomEventSchema =
                    p.schemas.get("Emit Custom Event");
                  const customEventSchema = p.schemas.get("Custom Event");
                  if (customEventSchema && emitCustomEventSchema) {
                    for (const event of props.graphModel.project.customEvents.values()) {
                      const lowercaseSchemaName = event.name.toLowerCase();

                      const searchMatches = leftoverSearchTokens.every((t) =>
                        lowercaseSchemaName.includes(t),
                      );

                      if (searchMatches) {
                        ret.push({
                          schema: emitCustomEventSchema,
                          name: `Emit ${event.name}`,
                          defaultProperties: { event: event.id },
                        });
                        ret.push({
                          schema: customEventSchema,
                          name: event.name,
                          defaultProperties: { event: event.id },
                        });
                      }
                    }
                  }
                }

                return ret;
              });

              return (
                <Show when={filteredSchemas().length !== 0}>
                  <Item
                    onPointerEnter={onPointerEnter}
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
                      {({ schema, suggestion, name, defaultProperties }) => (
                        <Item
                          class="ml-4"
                          onPointerEnter={onPointerEnter}
                          onClick={() =>
                            props.onSchemaClicked(schema, suggestion, {
                              name,
                              defaultProperties,
                            })
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
                              ],
                            )}
                          />
                          <span>{name ?? schema.name}</span>
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
        props.class,
      )}
    />
  );
}

function at<T>(array: Array<T>, index: number) {
  const length = array.length;
  const k = index >= 0 ? index : length + index;
  return k >= 0 && k < length ? array[k] : undefined;
}
