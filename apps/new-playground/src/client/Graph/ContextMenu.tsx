import { createMemo, createSignal, For, Show } from "solid-js";
import { cx } from "cva";
import createPresence from "solid-presence";

import { useGraphContext } from "./Context";
import { SchemaRef } from "../../domain/Package/data";
import { useProjectService } from "../AppRuntime";
import { ProjectState } from "../Project/State";

export function GraphContextMenu(props: {
  position: { x: number; y: number } | null;
  onSchemaClick: (
    schema: SchemaRef & { position: { x: number; y: number } },
  ) => void;
}) {
  const graphCtx = useGraphContext();
  const { state } = useProjectService(ProjectState);

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
      {(position) => (
        <div
          ref={setRef}
          data-open={props.position !== null}
          class={cx(
            "absolute flex flex-col px-2 bg-gray-1 border border-gray-3 rounded-lg text-sm",
            "origin-top-left data-[open='true']:(animate-in fade-in zoom-in-95) data-[open='false']:(animate-out fade-out zoom-out-95)",
          )}
          style={{
            left: `${position().x + (graphCtx.bounds.left ?? 0) - 16}px`,
            top: `${position().y + (graphCtx.bounds.top ?? 0) - 16}px`,
          }}
        >
          <For each={Object.entries(state.packages)}>
            {([pkgId, pkg]) => (
              <div class="py-1">
                <span class="font-bold">{pkgId}</span>
                <div>
                  <For each={Object.entries(pkg.schemas)}>
                    {([schemaId, schema]) => (
                      <button
                        class="block bg-transparent w-full text-left px-1 py-0.5 rounded @hover-bg-white/10 active:bg-white/10"
                        onClick={() => {
                          props.onSchemaClick({
                            pkgId,
                            schemaId,
                            position: {
                              x: position().x - 16,
                              y: position().y - 16,
                            },
                          });
                        }}
                      >
                        {schema.name ?? schemaId}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}
