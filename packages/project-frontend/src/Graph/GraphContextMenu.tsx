import type { PackageMeta, SchemaRef } from "@macrograph/project-domain";
import { cx } from "cva";
import {
  ComponentProps,
  For,
  Show,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import createPresence from "solid-presence";
import { createWritableMemo } from "@solid-primitives/memo";

import { useGraphContext } from "./Context";

export function GraphContextMenu(props: {
  position: { x: number; y: number } | null;
  onSchemaClick: (
    schema: SchemaRef & { position: { x: number; y: number } },
  ) => void;
  packages: Record<string, PackageMeta>;
}) {
  const graphCtx = useGraphContext();

  const [ref, setRef] = createSignal<HTMLElement | null>(null);

  const schemaMenuPresence = createPresence({
    show: () => props.position !== null,
    element: ref,
  });

  const schemaMenuPosition = createMemo(
    (prev: { x: number; y: number } | undefined) => {
      const m = props.position;
      if (m !== null) return m;
      return prev;
    },
  );

  return (
    <Show when={schemaMenuPresence.present() && schemaMenuPosition()}>
      {(position) => {
        const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(
          null,
        );
        const [search, setSearch] = createSignal<string>("");

        onMount(() => inputRef()?.focus());

        const lowercaseSearchTokens = createMemo(() =>
          search()
            .toLowerCase()
            .split(" ")
            .filter((s) => s !== ""),
        );

        return (
          <div
            ref={setRef}
            data-open={props.position !== null}
            class={cx(
              "absolute flex flex-col bg-gray-3 border border-gray-5 text-sm w-72 h-[22rem] rounded",
              "origin-top-left data-[open='true']:(animate-in fade-in zoom-in-95) data-[open='false']:(animate-out fade-out zoom-out-95)",
            )}
            style={{
              left: `${position().x - 16}px`,
              top: `${position().y - 16}px`,
            }}
          >
            <input
              ref={setInputRef}
              type="text"
              class="bg-transparent p-1.5 text-xs bg-gray-2 border-b border-gray-5 focus-visible:(ring-1 ring-inset ring-yellow outline-none) rounded-t"
              placeholder="Search Nodes..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
            <div class="p-1">
              <For each={Object.entries(props.packages)}>
                {([pkgId, pkg]) => {
                  const [open, setOpen] = createWritableMemo(
                    () => /*props.suggestion !== undefined ||*/ search() !== "",
                  );

                  return (
                    <div class="flex flex-col items-stretch">
                      <ItemButton
                        type="button"
                        onClick={() => setOpen(!open())}
                        class="group gap-0.5"
                        data-open={open()}
                      >
                        <IconMaterialSymbolsArrowRight class="group-data-[open='true']:rotate-90 transition-transform" />
                        <span>{pkgId}</span>
                      </ItemButton>
                      <Show when={open()}>
                        <div class="pl-2">
                          <For each={Object.entries(pkg.schemas)}>
                            {([schemaId, schema]) => (
                              <ItemButton
                                class="gap-2 pl-2"
                                onClick={() => {
                                  props.onSchemaClick({
                                    pkgId,
                                    schemaId,
                                    position: graphCtx.getGraphPosition({
                                      x: position().x - 16,
                                      y: position().y - 16,
                                    }),
                                  });
                                }}
                              >
                                <div class="size-3 bg-mg-event rounded-full" />
                                {schema.name ?? schemaId}
                              </ItemButton>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        );
      }}
    </Show>
  );
}

const ItemButton = (props: ComponentProps<"button">) => (
  <button
    type="button"
    {...props}
    class={cx(
      "flex flex-row py-0.5 items-center bg-transparent w-full text-left @hover-bg-gray-6/10 active:bg-gray-5 rounded focus-visible:(ring-1 ring-inset ring-yellow outline-none bg-gray-5)",
      props.class,
    )}
  />
);
